import * as react from "react";

import type { RawEnv } from "./global.js";

export type EnvSpaces = Record<string, RawEnv | undefined>;

const noSpaces: EnvSpaces = {};

let context: react.Context<EnvSpaces> | null = null;

export function envContext(): react.Context<EnvSpaces> {
  context ??= react.createContext(noSpaces);
  return context;
}

export function readContextRawEnv(name: string): RawEnv | undefined {
  if (!isReactRunning()) {
    throw new Error("React is not rendering, so there is no context to read.");
  }
  return react.use(envContext())[name];
}

function isReactRunning(): boolean {
  return (
    typeof react.captureOwnerStack !== "function" ||
    react.captureOwnerStack() !== null
  );
}
