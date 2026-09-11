import { existsSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { runtimeEnv } from "../env.js";
import { fixtureDir } from "../paths.js";

/**
 * The rows of the README table "Where each read works" that the other specs
 * do not already cover. Every route folds the outcome of both reads into
 * `ok:<value>` / `err:<message>`, so a context that throws is asserted on
 * rather than crashed into.
 */
const guardMessage =
  "is called while prerendering, so its value would be baked into the build output";

const appDir = path.join(fixtureDir, ".next", "server", "app");

test.describe("generateMetadata", () => {
  test("getAsync() works and makes the route dynamic", async ({ page }) => {
    await page.goto("/contexts/metadata");

    await expect(page).toHaveTitle(`ok:${runtimeEnv.APP_NAME}`);
    expect(existsSync(path.join(appDir, "contexts", "metadata.html"))).toBe(
      false,
    );
  });

  test("get() is caught by the render guard, at build time", async ({
    page,
  }) => {
    await page.goto("/contexts/metadata-sync");

    await expect(page).toHaveTitle(new RegExp(`^err:.*${guardMessage}`, "u"));
    expect(
      existsSync(path.join(appDir, "contexts", "metadata-sync.html")),
    ).toBe(true);
  });
});

test.describe("generateStaticParams", () => {
  test("both reads are rejected by the guard that names it", async ({
    request,
  }) => {
    const slug = "sync-guarded--async-guarded";
    const response = await request.get(`/contexts/static-params/${slug}`);

    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(slug);
  });
});

test.describe("a force-static Route Handler", () => {
  test("both reads are rejected while the response is prerendered at build", async ({
    request,
  }) => {
    const response = await request.get("/api/contexts/static-route");
    const reads = (await response.json()) as { sync: string; async: string };

    expect(reads.sync).toContain("while Next prerenders it at build time");
    expect(reads.sync).toContain("captured into the static response");
    expect(reads.async).toContain("while Next prerenders it at build time");
  });
});

test.describe("instrumentation.ts", () => {
  test("both reads answer with the runtime value", async ({ request }) => {
    const response = await request.get("/api/contexts/instrumentation");

    expect(await response.json()).toEqual({
      sync: `ok:${runtimeEnv.APP_NAME}`,
      async: `ok:${runtimeEnv.APP_NAME}`,
    });
  });
});

test.describe("proxy.ts", () => {
  test("both reads answer with the runtime value", async ({ request }) => {
    const response = await request.get("/contexts/proxy");

    expect(await response.json()).toEqual({
      sync: `ok:${runtimeEnv.APP_NAME}`,
      async: `ok:${runtimeEnv.APP_NAME}`,
    });
  });
});

/** Loads the page and waits for instrumentation-client.ts to report both reads. */
async function readsOn(page: Page, url: string) {
  await page.goto(url);
  await page.waitForFunction(() => window.instrumentationClientReads);
  return page.evaluate(() => window.instrumentationClientReads);
}

test.describe("instrumentation-client.ts", () => {
  const missingMessage = 'Env space "public" is missing on the client';
  const outsideRenderMessage = "was called outside of a render";

  test("both reads work on a page that renders <ClientEnvScript />", async ({
    page,
  }) => {
    expect(await readsOn(page, "/")).toEqual({
      sync: `ok:${runtimeEnv.APP_NAME}`,
      async: `ok:${runtimeEnv.APP_NAME}`,
    });
  });

  test("both throw on a page that does not publish the space", async ({
    page,
  }) => {
    const reads = await readsOn(page, "/render-guard");

    expect(reads?.sync).toContain(missingMessage);
    expect(reads?.async).toContain(outsideRenderMessage);
  });

  test("both throw below <ClientEnvProvider />, which runs after it", async ({
    page,
  }) => {
    const reads = await readsOn(page, "/provided");

    expect(reads?.sync).toContain(missingMessage);
    expect(reads?.async).toContain(outsideRenderMessage);
  });

  // /broken publishes another space and fails on it, so Next serves its error
  // document, without a script in it. A throw at module scope would stop the
  // boot that shows the failure, so get() answers undefined there and the error
  // is reported once the page has booted; getAsync() rejects as usual.
  test("get() answers undefined on the error document and reports it after the boot", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const failedMessage =
      "the server render of this page failed before its shell was ready";

    const reads = await readsOn(page, "/broken");

    expect(reads?.sync).toBe("ok:undefined");
    expect(reads?.async).toContain(failedMessage);
    await expect(page.getByTestId("broken-boundary")).toBeVisible();
    await expect
      .poll(() => errors.filter((message) => message.includes(failedMessage)))
      .toHaveLength(1);
  });
});
