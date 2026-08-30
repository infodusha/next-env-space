import { expect, test } from "@playwright/test";

import { buildTimeEnv } from "../env.js";

/**
 * The "use cache" row of the README table: the body runs during the build and
 * its result is cached, so the guard stops `get()` but `getAsync()` captures
 * the build machine's value — the one trap the package cannot detect.
 */
test.describe('a read inside a "use cache" function', () => {
  test("get() is caught by the render guard", async ({ page }) => {
    await page.goto("/contexts/use-cache");

    await expect(page.getByTestId("use-cache-sync")).toContainText(
      "is called while rendering, so its value can be captured at build time",
    );
  });

  test("getAsync() captures the build-time value", async ({ page }) => {
    await page.goto("/contexts/use-cache");

    await expect(page.getByTestId("use-cache-async")).toHaveText(
      `ok:${buildTimeEnv.APP_NAME}`,
    );
  });
});
