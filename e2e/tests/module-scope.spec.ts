import { existsSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { runtimeEnv } from "../env.js";
import { fixtureDir } from "../paths.js";

test.describe("a read at module scope", () => {
  test("survives the build of a static route", () => {
    // The module is evaluated during the prerender, where the render guard
    // must not mistake the module-scope read for a render-time one.
    expect(
      existsSync(
        path.join(fixtureDir, ".next", "server", "app", "module-scope.html"),
      ),
    ).toBe(true);
  });

  test("holds the runtime value on a dynamic route", async ({ page }) => {
    await page.goto("/module-scope/dynamic");

    await expect(page.getByTestId("module-scope-app-name")).toHaveText(
      runtimeEnv.APP_NAME,
    );
    await expect(page.getByTestId("module-scope-app-name-async")).toHaveText(
      runtimeEnv.APP_NAME,
    );
  });

  test("bakes undefined when rendered into a prerender — the documented trap", async ({
    page,
  }) => {
    // next build parses nothing, so both constants held undefined while the
    // page was prerendered, and an empty spot is what the static HTML shows.
    await page.goto("/module-scope");

    await expect(page.getByTestId("module-scope-app-name")).toHaveText("");
    await expect(page.getByTestId("module-scope-app-name-async")).toHaveText(
      "",
    );
  });
});
