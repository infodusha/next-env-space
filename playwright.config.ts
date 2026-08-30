import { defineConfig, devices } from "@playwright/test";

import { port, runtimeEnv } from "./e2e/env.js";
import { fixtureDir, nextBin } from "./e2e/global-setup.js";

const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : "50%",
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./e2e/global-setup.ts",

  expect: { timeout: 10_000 },

  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "on-first-retry",
  },

  webServer: {
    command: `${process.execPath} ${nextBin} start --port ${port}`,
    cwd: fixtureDir,
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...runtimeEnv,
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
