import { existsSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { fixtureDir } from "../paths.js";

const guardMessage =
  "is called while rendering, so its value can be captured at build time";

test.describe("getEnv() inside a Server Component render", () => {
  test("throws while the route is prerendered at build time", async ({
    page,
  }) => {
    await page.goto("/render-guard");

    await expect(page.getByTestId("message")).toContainText(
      `getEnv('APP_NAME') of the "public" env space`,
    );
    await expect(page.getByTestId("message")).toContainText(guardMessage);
  });

  test("throws in a dynamic render too", async ({ page }) => {
    await page.goto("/render-guard/dynamic");

    await expect(page.getByTestId("message")).toContainText(guardMessage);
  });
});

test.describe("prerendering", () => {
  const appDir = path.join(fixtureDir, ".next", "server", "app");

  test("a route that only calls getEnv() stays static", () => {
    expect(existsSync(path.join(appDir, "render-guard.html"))).toBe(true);
  });

  test("a route that calls getEnvAsync() does not", () => {
    expect(existsSync(path.join(appDir, "async-env.html"))).toBe(false);
  });
});
