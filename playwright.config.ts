import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

import { port } from "./e2e/env.js";
import { rootDir } from "./e2e/paths.js";

const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : "50%",
  reporter: process.env.CI ? "github" : "list",

  expect: { timeout: 10_000 },

  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "on-first-retry",
  },

  webServer: {
    command: `"${process.execPath}" "${path.join(rootDir, "e2e", "serve.ts")}"`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
});
