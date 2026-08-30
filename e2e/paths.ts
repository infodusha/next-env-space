import path from "node:path";

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
