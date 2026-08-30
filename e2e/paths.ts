import path from "node:path";

const e2eDir = import.meta.dirname;

export const rootDir = path.join(e2eDir, "..");
export const fixtureDir = path.join(e2eDir, "fixture");

/** The same app patterns, but under `cacheComponents: true`. */
export const cacheFixtureDir = path.join(e2eDir, "fixture-cache");

/** A second app whose build has to fail: it imports /server from a client module. */
export const clientImportFixtureDir = path.join(
  e2eDir,
  "fixture-client-import",
);

export function nextBinOf(fixture: string): string {
  return path.join(fixture, "node_modules", "next", "dist", "bin", "next");
}
