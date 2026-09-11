import { expect, test } from "@playwright/test";

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
