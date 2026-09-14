import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { cacheFixtureDir } from "../paths.js";

/**
 * What `next build` left on disk: under Cache Components every route gets a
 * static shell, and the question per route is what made it into that shell.
 * The build parses nothing, so a synchronous read it reached shows up as an
 * empty spot — never as a value.
 */
test.describe("the static shell", () => {
  const appDir = path.join(cacheFixtureDir, ".next", "server", "app");

  test("keeps a getAsync() value out, as a dynamic hole", () => {
    const shell = readFileSync(path.join(appDir, "async-env.html"), "utf8");

    // The paragraph that renders the value sits inside the hole, so the shell
    // has neither it nor an empty stand-in for it.
    expect(shell).not.toContain('data-testid="app-name"');
  });

  test("captures a synchronous client read as undefined — the documented trap", () => {
    const shell = readFileSync(path.join(appDir, "client.html"), "utf8");

    expect(shell).toContain('<p data-testid="client-app-name"></p>');
    expect(shell).toContain(
      '<p data-testid="client-timeout-type">undefined</p>',
    );
  });

  test("holds the render-guard message for a get() in a render", () => {
    const shell = readFileSync(path.join(appDir, "render-guard.html"), "utf8");

    expect(shell).toContain(
      "is called while prerendering, so its value would be baked into the build output",
    );
  });

  test("survives a module-scope read, and captures the undefined it renders", () => {
    const shellPath = path.join(appDir, "module-scope.html");

    expect(existsSync(shellPath)).toBe(true);
    expect(readFileSync(shellPath, "utf8")).toContain(
      '<p data-testid="module-scope-app-name"></p>',
    );
  });
});
