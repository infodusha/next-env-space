import { execFileSync, spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

// `.ts` specifiers: Node runs this file directly, stripping the types, and
// resolves the extension it is given rather than mapping it back from `.js`.
import { ports, runtimeEnv } from "./env.ts";
import { cacheFixtureDir, fixtureDir, nextBinOf, rootDir } from "./paths.ts";

/**
 * The `webServer` command of the Playwright config, once per fixture: builds
 * the app with none of its variables set — the build the README promises —
 * then serves it with `runtimeEnv`, which is what makes "read at runtime" an
 * observable property rather than a claim.
 *
 * Both steps live here rather than in a `globalSetup` because Playwright starts
 * `webServer` first — its plugin setup tasks run ahead of the global setups —
 * so a build over there would only reach the server one run later, and every
 * run would test the build before it.
 */

const [fixture = "plain"] = process.argv.slice(2);

if (fixture !== "plain" && fixture !== "cache") {
  throw new Error(`Unknown fixture "${fixture}". Pass "plain" or "cache".`);
}

const appDir = fixture === "cache" ? cacheFixtureDir : fixtureDir;
const port = ports[fixture];
const nextBin = nextBinOf(appDir);

if (!existsSync(path.join(rootDir, "dist", "index.js"))) {
  throw new Error(
    "next-env-space is not built. Run `pnpm build` before `playwright test`.",
  );
}

// Next keeps a build cache that does not watch the package under test, so a
// stale build would be served back.
rmSync(path.join(appDir, ".next"), { recursive: true, force: true });

// Whatever the shell that runs the suite exports, the build sees none of the
// fixture's variables.
const buildEnv = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !Object.hasOwn(runtimeEnv, key),
  ),
);

execFileSync(process.execPath, [nextBin, "build"], {
  cwd: appDir,
  stdio: "inherit",
  env: { ...buildEnv, NEXT_TELEMETRY_DISABLED: "1" },
});

const server = spawn(
  process.execPath,
  [nextBin, "start", "--port", String(port)],
  {
    cwd: appDir,
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
