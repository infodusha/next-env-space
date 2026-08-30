import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

import { ports } from "./e2e/env.js";
import { rootDir } from "./e2e/paths.js";

const serveScript = path.join(rootDir, "e2e", "serve.ts");

const baseURLs = {
  plain: `http://127.0.0.1:${ports.plain}`,
  cache: `http://127.0.0.1:${ports.cache}`,
} as const;

export default defineConfig({
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : "50%",
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

  expect: { timeout: 10_000 },

  use: {
    ...devices["Desktop Chrome"],
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "plain",
      testDir: "./e2e/tests",
      use: { baseURL: baseURLs.plain },
    },
    {
      name: "cache",
      testDir: "./e2e/tests-cache",
      use: { baseURL: baseURLs.cache },
    },
  ],

  webServer: [
    {
      command: `"${process.execPath}" "${serveScript}" plain`,
      url: `${baseURLs.plain}/api/health`,
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: "pipe",
      stderr: "pipe",
      env: { NEXT_TELEMETRY_DISABLED: "1" },
    },
    {
      command: `"${process.execPath}" "${serveScript}" cache`,
      url: `${baseURLs.cache}/api/health`,
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: "pipe",
      stderr: "pipe",
      env: { NEXT_TELEMETRY_DISABLED: "1" },
    },
  ],
});
