import { expect, test } from "@playwright/test";

import { runtimeEnv } from "../env.js";

/**
 * A module that Next imports lazily inside a render runs its module scope in
 * the request scope of that render, where React cannot tell a module-scope
 * read from one in a component body. A dynamic request captures nothing, so
 * the render guard has to let such a read through with the runtime value.
 */

test.describe("a module-scope read in a module a dynamic import() loads", () => {
  test("goes through with the runtime value during a dynamic render", async ({
    page,
  }) => {
    await page.goto("/lazy-import");

    await expect(page.getByTestId("lazy-app-name")).toHaveText(
      `ok:${runtimeEnv.APP_NAME}`,
    );
  });
});

test.describe("a module-scope read in a page a prefetch reaches first", () => {
  // The prefetch has to be the first request of the server process to reach
  // the page, so these run in order, on one worker.
  test.describe.configure({ mode: "serial" });

  test("survives the prefetch and leaves the metadata intact", async ({
    request,
  }) => {
    // A prefetch renders a route only down to its first loading boundary, so
    // the component tree does not import the page; what does depends on the
    // Next version — resolving the metadata, inside the Flight render, on an
    // older one. Either way the page's title has to make it into the payload.
    const response = await request.get("/prefetch/target", {
      headers: { RSC: "1", "Next-Router-Prefetch": "1" },
    });

    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("prefetched page");
  });

  test("and the navigation shows the runtime values", async ({ page }) => {
    await page.goto("/prefetch");
    await page.getByRole("link", { name: "to prefetched page" }).click();

    await expect(page).toHaveURL("/prefetch/target");
    await expect(page.getByTestId("prefetched-app-name")).toHaveText(
      runtimeEnv.APP_NAME,
    );
    await expect(page.getByTestId("prefetched-app-name-async")).toHaveText(
      runtimeEnv.APP_NAME,
    );
  });
});
