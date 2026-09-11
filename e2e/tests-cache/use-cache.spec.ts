import { expect, test } from "@playwright/test";

import { runtimeEnv } from "../env.js";

/**
 * The "use cache" row of the README table: the body runs during the build and
 * its result is cached, so a read there could only capture the build
 * machine's value — both reads are rejected by the guard that says so.
 */
const guardMessage = "is called inside a cached function";

test.describe('a read inside a "use cache" function', () => {
  test("get() is rejected by the cached-function guard", async ({ page }) => {
    await page.goto("/contexts/use-cache");

    await expect(page.getByTestId("use-cache-sync")).toContainText(
      guardMessage,
    );
    await expect(page.getByTestId("use-cache-sync")).toContainText(
      "pass it in as an argument",
    );
  });

  test("getAsync() is rejected the same way", async ({ page }) => {
    await page.goto("/contexts/use-cache");

    await expect(page.getByTestId("use-cache-async")).toContainText(
      guardMessage,
    );
  });
});

test.describe('a "use cache" function the running server fills', () => {
  test("both reads answer the runtime value, and the fill is cached", async ({
    page,
  }) => {
    await page.goto("/contexts/use-cache/runtime");

    await expect(page.getByTestId("use-cache-runtime-sync")).toHaveText(
      `ok:${runtimeEnv.APP_NAME}`,
    );
    await expect(page.getByTestId("use-cache-runtime-async")).toHaveText(
      `ok:${runtimeEnv.APP_NAME}`,
    );
    const token = await page.getByTestId("use-cache-runtime-token").innerText();
    expect(token).toMatch(/^[0-9a-f-]{36}$/u);

    // A second request is a hit: the same body run, the same token.
    await page.goto("/contexts/use-cache/runtime");
    await expect(page.getByTestId("use-cache-runtime-token")).toHaveText(token);
  });
});
