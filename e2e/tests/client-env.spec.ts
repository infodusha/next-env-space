import { expect, test, type Page } from "@playwright/test";

import { runtimeEnv } from "../env.js";

test.describe("a space that was shipped to the browser", () => {
  test("is readable from a client component", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("client-app-name")).toHaveText(
      runtimeEnv.APP_NAME,
    );
    await expect(page.getByTestId("client-timeout")).toHaveText(
      runtimeEnv.REQUEST_TIMEOUT_SECONDS,
    );
    await expect(page.getByTestId("client-feature-enabled")).toHaveText("true");
  });

  test("keeps every space under its own key", async ({ page }) => {
    await page.goto("/");

    const spaces = await page.evaluate(() => window.__ENV_SPACES__);

    expect(Object.keys(spaces ?? {}).toSorted()).toEqual(["feature", "public"]);
    expect(spaces?.public?.APP_NAME).toBe(runtimeEnv.APP_NAME);
    expect(spaces?.feature?.FEATURE_LABEL).toBe(runtimeEnv.FEATURE_LABEL);
  });

  test("reads a second space independently", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("client-feature-label")).toHaveText(
      runtimeEnv.FEATURE_LABEL,
    );
  });

  test("survives a client-side navigation without a second script", async ({
    page,
  }) => {
    await page.goto("/");
    const before = await countEnvScripts(page);

    await page.getByRole("link", { name: "to client page" }).click();
    await expect(page).toHaveURL("/client");

    await expect(page.getByTestId("client-app-name")).toHaveText(
      runtimeEnv.APP_NAME,
    );
    expect(await countEnvScripts(page)).toBe(before);
  });

  test("hydrates without a mismatch", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/");
    await expect(page.getByTestId("client-env")).toBeVisible();

    expect(errors).toEqual([]);
  });
});

test.describe("a space read with use() in a client component", () => {
  test("resolves to the runtime values", async ({ page }) => {
    await page.goto("/use-env");

    await expect(page.getByTestId("use-app-name")).toHaveText(
      runtimeEnv.APP_NAME,
    );
    await expect(page.getByTestId("use-timeout")).toHaveText(
      runtimeEnv.REQUEST_TIMEOUT_SECONDS,
    );
    await expect(page.getByTestId("use-timeout-type")).toHaveText("number");
    await expect(page.getByTestId("use-feature-label")).toHaveText(
      runtimeEnv.FEATURE_LABEL,
    );
  });

  // React only names an uncached promise on the console in development, which
  // this production build has none of. What it does either way is suspend, so
  // the observable part is the extra render that follows.
  test("unwraps without suspending, in a single render", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/use-env");
    await expect(page.getByTestId("use-env")).toBeVisible();

    expect(await page.evaluate(() => window.useEnvRenders)).toBe(1);
    expect(errors).toEqual([]);
  });

  test("survives a client-side navigation", async ({ page }) => {
    await page.goto("/use-env");
    await page.getByRole("link", { name: "to home page" }).click();
    await expect(page).toHaveURL("/");

    await expect(page.getByTestId("client-app-name")).toHaveText(
      runtimeEnv.APP_NAME,
    );
  });
});

test("a space that was never shipped fails loudly in the browser", async ({
  page,
}) => {
  await page.goto("/unpublished");
  await page
    .getByRole("button", { name: "read the unpublished space" })
    .click();

  await expect(page.getByTestId("message")).toContainText(
    'Env space "unpublished" is missing on the client.',
  );
  await expect(page.getByTestId("message")).toContainText("<WithClientEnv");
});

function countEnvScripts(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      [...document.querySelectorAll("script")].filter((script) =>
        script.textContent?.includes("__ENV_SPACES__"),
      ).length,
  );
}
