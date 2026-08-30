import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { buildTimeEnv } from "../env.js";
import { cacheFixtureDir } from "../paths.js";

/**
 * What `next build` left on disk: under Cache Components every route gets a
 * static shell, and the question per route is what made it into that shell.
 */
test.describe("the static shell", () => {
  const appDir = path.join(cacheFixtureDir, ".next", "server", "app");

  test("keeps a getAsync() value out, as a dynamic hole", () => {
    const shell = readFileSync(path.join(appDir, "async-env.html"), "utf8");

    expect(shell).not.toContain(buildTimeEnv.APP_NAME);
  });

  test("captures a synchronous client read — the documented trap", () => {
    const shell = readFileSync(path.join(appDir, "client.html"), "utf8");

    expect(shell).toContain(buildTimeEnv.APP_NAME);
  });

  test("holds the render-guard message for a get() in a render", () => {
    const shell = readFileSync(path.join(appDir, "render-guard.html"), "utf8");

    expect(shell).toContain(
      "is called while rendering, so its value can be captured at build time",
    );
  });

  test("survives a module-scope read, and captures what it renders", () => {
    const shellPath = path.join(appDir, "module-scope.html");

    expect(existsSync(shellPath)).toBe(true);
    expect(readFileSync(shellPath, "utf8")).toContain(buildTimeEnv.APP_NAME);
  });
});
