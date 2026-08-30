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
  return react.use(envContext())[name];
}
