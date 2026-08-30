import { io } from "next/cache";

import { cacheComponentsEnabled } from "./cache-components.js";
import { readContextRawEnv } from "./context.js";
import { createEnvSpaceWith, type CreateEnvSpace } from "./space.js";

export * from "./types.js";

export const createEnvSpace: CreateEnvSpace = createEnvSpaceWith({
  optOutOfPrerender: io,
  optsOutInReactServer: cacheComponentsEnabled,
  readContextRawEnv,
});
