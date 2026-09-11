import { existsSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { runtimeEnv } from "../env.js";
import { fixtureDir } from "../paths.js";

const guardMessage =
  "is called while prerendering, so its value would be baked into the build output";

test.describe("get() inside a Server Component render", () => {
  test("throws while the route is prerendered at build time", async ({
    page,
  }) => {
    await page.goto("/render-guard");

    await expect(page.getByTestId("message")).toContainText(
      `get('APP_NAME') of the "public" env space`,
    );
    await expect(page.getByTestId("message")).toContainText(guardMessage);
  });

  test("answers the runtime value in a dynamic render, which captures nothing", async ({
    page,
  }) => {
    await page.goto("/render-guard/dynamic");

    await expect(page.getByTestId("message")).toHaveText(
      `ok:${runtimeEnv.APP_NAME}`,
    );
  });
});

test.describe("get() inside a prerender on the running server", () => {
  test("ISR on demand: answers the runtime value, and the page is cached", async ({
    request,
  }) => {
    // No params at build time, so this is the first render of the route — a
    // prerender, but one the running server does with its own environment.
    const first = await request.get("/isr/on-demand");
    expect(first.status()).toBe(200);
    expect(await first.text()).toContain(`ok:${runtimeEnv.APP_NAME}`);

    const second = await request.get("/isr/on-demand");
    expect(second.headers()["x-nextjs-cache"]).toBe("HIT");
    expect(await second.text()).toContain(`ok:${runtimeEnv.APP_NAME}`);
  });

  test("ISR Route Handler on demand: answers the runtime value, and the response is cached", async ({
    request,
  }) => {
    const first = await request.get("/api/isr/on-demand");
    expect(first.status()).toBe(200);
    expect(await first.json()).toEqual({ sync: `ok:${runtimeEnv.APP_NAME}` });

    const second = await request.get("/api/isr/on-demand");
    expect(second.headers()["x-nextjs-cache"]).toBe("HIT");
  });
});

test.describe("prerendering", () => {
  const appDir = path.join(fixtureDir, ".next", "server", "app");

  test("a route that only calls get() stays static", () => {
    expect(existsSync(path.join(appDir, "render-guard.html"))).toBe(true);
  });

  test("a route that calls getAsync() does not", () => {
    expect(existsSync(path.join(appDir, "async-env.html"))).toBe(false);
  });
});
