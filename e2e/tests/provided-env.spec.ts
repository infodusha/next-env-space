import { expect, test } from "@playwright/test";

import { buildTimeEnv, runtimeEnv } from "../env.js";
import { readEnvScripts } from "../html.js";

test.describe("a space provided through context", () => {
  test("is readable with use() in a client component", async ({ page }) => {
    await page.goto("/provided");

    await expect(page.getByTestId("provided-label")).toHaveText(
      runtimeEnv.PROVIDED_LABEL,
    );
    await expect(page.getByTestId("provided-count")).toHaveText(
      runtimeEnv.PROVIDED_COUNT,
    );
    await expect(page.getByTestId("provided-count-type")).toHaveText("number");
  });

  test("stays readable under a second, nested provider", async ({ page }) => {
    await page.goto("/provided");

    await expect(page.getByTestId("provided-nested")).toHaveText(
      runtimeEnv.PROVIDED_NESTED,
    );
    await expect(page.getByTestId("provided-label")).toHaveText(
      runtimeEnv.PROVIDED_LABEL,
    );
  });

  test("reaches the browser without an inline script", async ({
    page,
    request,
  }) => {
    const html = await (await request.get("/provided")).text();

    expect(html).not.toContain("__ENV_SPACES__");
    expect(readEnvScripts(html)).toEqual([]);

    await page.goto("/provided");
    expect(await page.evaluate(() => window.__ENV_SPACES__)).toBeUndefined();
  });

  test("carries the runtime values, not the build-time ones", async ({
    request,
  }) => {
    const html = await (await request.get("/provided")).text();

    for (const key of [
      "PROVIDED_LABEL",
      "PROVIDED_COUNT",
      "PROVIDED_NESTED",
    ] as const) {
      expect(html, `the build-time value of ${key} leaked`).not.toContain(
        buildTimeEnv[key],
      );
      expect(html).toContain(runtimeEnv[key]);
    }
  });

  test("unwraps without suspending, in a single render", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/provided");
    await expect(page.getByTestId("provided-env")).toBeVisible();

    expect(await page.evaluate(() => window.providedEnvRenders)).toBe(1);
    expect(errors).toEqual([]);
  });

  test("reaches a layout that only a client-side navigation mounts", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/soft-nav");
    await page.getByRole("link", { name: "to provided page" }).click();
    await expect(page).toHaveURL("/provided");

    await expect(page.getByTestId("provided-label")).toHaveText(
      runtimeEnv.PROVIDED_LABEL,
    );
    await expect(page.getByTestId("provided-nested")).toHaveText(
      runtimeEnv.PROVIDED_NESTED,
    );
    expect(errors).toEqual([]);
  });
});

test.describe("a space that only context carries", () => {
  test("names both publishers when read synchronously", async ({ page }) => {
    await page.goto("/provided-late");
    await page.getByRole("button", { name: "read it synchronously" }).click();

    await expect(page.getByTestId("message")).toContainText(
      'Env space "provided-nested" is missing on the client.',
    );
    await expect(page.getByTestId("message")).toContainText("<WithClientEnv");
    await expect(page.getByTestId("message")).toContainText("<UseClientEnv");
  });

  test("says so when getAsync() runs outside a render", async ({ page }) => {
    await page.goto("/provided-late");
    await page.getByRole("button", { name: "read it asynchronously" }).click();

    await expect(page.getByTestId("message")).toContainText(
      "was called outside of a render",
    );
    await expect(page.getByTestId("message")).toContainText("<WithClientEnv");
  });
});
