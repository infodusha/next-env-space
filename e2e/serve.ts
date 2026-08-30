import { execFileSync, spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

// `.ts` specifiers: Node runs this file directly, stripping the types, and
// resolves the extension it is given rather than mapping it back from `.js`.
import { buildTimeEnv, port, runtimeEnv } from "./env.ts";
import { fixtureDir, nextBin, rootDir } from "./paths.ts";

/**
 * The `webServer` command of the Playwright config: builds the fixture with
 * `buildTimeEnv`, then serves it with `runtimeEnv`, which is what makes "read
 * at runtime" an observable property rather than a claim.
 *
 * Both steps live here rather than in a `globalSetup` because Playwright starts
 * `webServer` first — its plugin setup tasks run ahead of the global setups —
 * so a build over there would only reach the server one run later, and every
 * run would test the build before it.
 */

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

const server = spawn(
  process.execPath,
  [nextBin, "start", "--port", String(port)],
  {
    cwd: fixtureDir,
    stdio: "inherit",
    env: {
      ...process.env,
      ...runtimeEnv,
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
);

server.on("exit", (code, signal) => {
  process.exit(signal === null ? (code ?? 0) : 1);
});
