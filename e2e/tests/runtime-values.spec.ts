import { expect, test } from "@playwright/test";

import { buildTimeEnv, runtimeEnv } from "../env.js";

test.describe("values come from the running server, not from the build", () => {
  test("a Server Component reads them with getAsync()", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("server-app-name")).toHaveText(
      runtimeEnv.APP_NAME,
    );
    await expect(page.getByTestId("server-timeout")).toHaveText(
      runtimeEnv.REQUEST_TIMEOUT_SECONDS,
    );
    await expect(page.getByTestId("server-feature-enabled")).toHaveText("true");
  });

  test("no build-time value survives anywhere in the response", async ({
    request,
  }) => {
    const html = await (await request.get("/")).text();

    for (const [key, value] of Object.entries(buildTimeEnv)) {
      expect(html, `the build-time value of ${key} leaked`).not.toContain(
        value,
      );
    }
  });

  test("every key is parsed with its own schema", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("server-timeout-type")).toHaveText("number");
    await expect(page.getByTestId("client-timeout-type")).toHaveText("number");
    await expect(page.getByTestId("client-feature-enabled-type")).toHaveText(
      "boolean",
    );
  });

  test("an optional key that is set nowhere reads as undefined", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByTestId("server-app-version")).toHaveText("(unset)");
    await expect(page.getByTestId("client-app-version")).toHaveText("(unset)");
  });

  test("a Route Handler reads them synchronously", async ({ request }) => {
    const response = await request.get("/api/env");

    expect(response.ok()).toBe(true);
    expect(await response.json()).toEqual({
      appName: runtimeEnv.APP_NAME,
      appNameAsync: runtimeEnv.APP_NAME,
      requestTimeoutSeconds: Number(runtimeEnv.REQUEST_TIMEOUT_SECONDS),
      featureEnabled: true,
      sessionSecret: runtimeEnv.SESSION_SECRET,
    });
  });

  test("a Server Action reads them, get() and getAsync() alike", async ({
    page,
  }) => {
    await page.goto("/action");
    await page.getByRole("button", { name: "read in a server action" }).click();

    await expect(page.getByTestId("action-env")).toHaveText(
      `${runtimeEnv.APP_NAME} ${runtimeEnv.APP_NAME} ` +
        `secret:${runtimeEnv.SESSION_SECRET.length}`,
    );
  });

  // Nothing else on this route is dynamic, so a build-time value would mean the
  // opt-out never ran and the route was baked at build time.
  test("getAsync() opts its route out of prerendering", async ({ page }) => {
    await page.goto("/async-env");

    await expect(page.getByTestId("app-name")).toHaveText(runtimeEnv.APP_NAME);
  });
});
