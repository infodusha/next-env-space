import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

import { buildTimeEnv } from "./env.js";

const e2eDir = import.meta.dirname;

export const rootDir = path.join(e2eDir, "..");
export const fixtureDir = path.join(e2eDir, "fixture");
export const nextBin = path.join(
  fixtureDir,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);

/**
 * Builds the fixture app with `buildTimeEnv`. The server is then started with
 * `runtimeEnv` by the `webServer` entry of the Playwright config, which is what
 * makes "read at runtime" an observable property rather than a claim.
 */
export default function globalSetup(): void {
  if (!existsSync(path.join(rootDir, "dist", "index.js"))) {
    throw new Error(
      "next-env-space is not built. Run `pnpm build` before `playwright test`.",
    );
  }

  // Next keeps a build cache that survives an env change, and two runs differ
  // only by env, so a stale build would be served back.
  rmSync(path.join(fixtureDir, ".next"), { recursive: true, force: true });

  execFileSync(process.execPath, [nextBin, "build"], {
    cwd: fixtureDir,
    stdio: "inherit",
    env: {
      ...process.env,
      ...buildTimeEnv,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });
}
