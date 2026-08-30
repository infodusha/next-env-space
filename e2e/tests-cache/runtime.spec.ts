import { expect, test } from "@playwright/test";

import { buildTimeEnv, runtimeEnv } from "../env.js";
import { readEnvSpaces } from "../html.js";

test.describe("a dynamic hole under Cache Components", () => {
  test("streams the runtime values into a Server Component", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByTestId("server-app-name")).toHaveText(
      runtimeEnv.APP_NAME,
    );
    await expect(page.getByTestId("server-timeout")).toHaveText(
      runtimeEnv.REQUEST_TIMEOUT_SECONDS,
    );
    await expect(page.getByTestId("server-feature-enabled")).toHaveText("true");
  });

  test("streams the inline script with the runtime raw values", async ({
    request,
  }) => {
    const html = await (await request.get("/")).text();

    expect(html).not.toContain(buildTimeEnv.APP_NAME);
    expect(readEnvSpaces(html).public?.APP_NAME).toBe(runtimeEnv.APP_NAME);
  });

  test("serves a client read from the script, not the shell", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByTestId("client-app-name")).toHaveText(
      runtimeEnv.APP_NAME,
    );
    await expect(page.getByTestId("client-timeout-type")).toHaveText("number");
  });
});

test.describe("a synchronous client read baked into the shell", () => {
  test("is healed to the runtime values on hydration", async ({ page }) => {
    // The response body carries the build-time capture (see shell.spec.ts);
    // the page the visitor ends up with must not.
    await page.goto("/client");

    await expect(page.getByTestId("client-app-name")).toHaveText(
      runtimeEnv.APP_NAME,
    );
    await expect(page.getByTestId("client-feature-enabled")).toHaveText("true");
  });
});

test.describe("use() in a client component", () => {
  test("resolves to the runtime values without suspending", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/use-env");

    await expect(page.getByTestId("use-app-name")).toHaveText(
      runtimeEnv.APP_NAME,
    );
    await expect(page.getByTestId("use-timeout-type")).toHaveText("number");
    // Polled: the text above streams in ahead of hydration, which is what
    // sets the counter.
    await expect.poll(() => page.evaluate(() => window.useEnvRenders)).toBe(1);
    expect(errors).toEqual([]);
  });
});

test.describe("a space provided through context", () => {
  test("is readable below nested providers, in a single render", async ({
    page,
  }) => {
    await page.goto("/provided");

    await expect(page.getByTestId("provided-label")).toHaveText(
      runtimeEnv.PROVIDED_LABEL,
    );
    await expect(page.getByTestId("provided-count-type")).toHaveText("number");
    await expect(page.getByTestId("provided-nested")).toHaveText(
      runtimeEnv.PROVIDED_NESTED,
    );
    // Polled: the text above streams in ahead of hydration, which is what
    // sets the counter.
    await expect
      .poll(() => page.evaluate(() => window.providedEnvRenders))
      .toBe(1);
  });

  test("reaches the browser without an inline script", async ({
    page,
    request,
  }) => {
    const html = await (await request.get("/provided")).text();

    expect(html).not.toContain("__ENV_SPACES__");

    await page.goto("/provided");
    expect(await page.evaluate(() => window.__ENV_SPACES__)).toBeUndefined();
  });
});

test.describe("reads outside a render", () => {
  test("a Route Handler answers get() and getAsync() — io() included", async ({
    request,
  }) => {
    const response = await request.get("/api/env");

    expect(response.ok()).toBe(true);
    expect(await response.json()).toEqual({
      appName: runtimeEnv.APP_NAME,
      appNameAsync: runtimeEnv.APP_NAME,
      requestTimeoutSeconds: Number(runtimeEnv.REQUEST_TIMEOUT_SECONDS),
      sessionSecret: runtimeEnv.SESSION_SECRET,
    });
  });

  test("a Server Action answers both as well", async ({ page }) => {
    await page.goto("/action");
    await page.getByRole("button", { name: "read in a server action" }).click();

    await expect(page.getByTestId("action-env")).toHaveText(
      `${runtimeEnv.APP_NAME} ${runtimeEnv.APP_NAME} ` +
        `secret:${runtimeEnv.SESSION_SECRET.length}`,
    );
  });
});

test.describe("guards and module scope", () => {
  test("get() throws in a dynamic render too", async ({ page }) => {
    await page.goto("/render-guard/dynamic");

    await expect(page.getByTestId("message")).toContainText(
      "is called while rendering, so its value can be captured at build time",
    );
  });

  test("a module-scope read holds the runtime value on a dynamic route", async ({
    page,
  }) => {
    await page.goto("/module-scope/dynamic");

    await expect(page.getByTestId("module-scope-app-name")).toHaveText(
      runtimeEnv.APP_NAME,
    );
  });
});

test("a publisher mounted by a client-side navigation still delivers", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/soft-nav");
  expect(await page.evaluate(() => window.__ENV_SPACES__)).toBeUndefined();

  await page.getByRole("link", { name: "to client page" }).click();
  await expect(page).toHaveURL("/client");

  // Scoped to the new page: while a navigation streams in, the old page can
  // still sit in the document next to it for a moment.
  const clientPage = page.locator("main", {
    has: page.getByRole("heading", { name: "client" }),
  });
  await expect(clientPage.getByTestId("client-app-name")).toHaveText(
    runtimeEnv.APP_NAME,
  );
  expect(errors).toEqual([]);
});
