import { existsSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { buildTimeEnv, runtimeEnv } from "../env.js";
import { fixtureDir } from "../paths.js";

/**
 * The rows of the README table "Where each read works" that the other specs
 * do not already cover. Every route folds the outcome of both reads into
 * `ok:<value>` / `err:<message>`, so a context that throws is asserted on
 * rather than crashed into.
 */
const guardMessage =
  "is called while rendering, so its value can be captured at build time";
const noRequestMessage = "outside a request scope";

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
  test("get() answers with the build-time value, getAsync() throws", async ({
    request,
  }) => {
    const slug = `sync-ok-${buildTimeEnv.APP_NAME}--async-err`;
    const response = await request.get(`/contexts/static-params/${slug}`);

    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(slug);
  });
});

test.describe("a force-static Route Handler", () => {
  test("bakes the build-time value in through both reads", async ({
    request,
  }) => {
    const response = await request.get("/api/contexts/static-route");

    expect(await response.json()).toEqual({
      sync: `ok:${buildTimeEnv.APP_NAME}`,
      async: `ok:${buildTimeEnv.APP_NAME}`,
    });
  });
});

test.describe("instrumentation.ts", () => {
  test("get() reads the runtime value, getAsync() has no request", async ({
    request,
  }) => {
    const response = await request.get("/api/contexts/instrumentation");
    const reads = (await response.json()) as { sync: string; async: string };

    expect(reads.sync).toBe(`ok:${runtimeEnv.APP_NAME}`);
    expect(reads.async).toMatch(/^err:/u);
    expect(reads.async).toContain(noRequestMessage);
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
});
