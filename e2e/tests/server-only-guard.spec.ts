import { execFile } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import { clientImportFixtureDir, nextBinOf } from "../paths.js";

const run = promisify(execFile);

interface FailedRun {
  readonly stdout?: string;
  readonly stderr?: string;
}

test('importing "next-env-space/server" from a client component fails the build', async () => {
  test.setTimeout(240_000);

  rmSync(path.join(clientImportFixtureDir, ".next"), {
    recursive: true,
    force: true,
  });

  const nextBin = nextBinOf(clientImportFixtureDir);
  const failure = await run(process.execPath, [nextBin, "build"], {
    cwd: clientImportFixtureDir,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  }).then(
    () => null,
    (error: FailedRun) => error,
  );

  expect(failure, "the build was expected to fail").not.toBeNull();
  expect(`${failure?.stdout ?? ""}${failure?.stderr ?? ""}`).toContain(
    "server-only",
  );
});
