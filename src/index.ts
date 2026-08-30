import { io } from "next/cache";

import { readContextRawEnv } from "./context.js";
import { cacheComponentsEnabled } from "./process-env.js";
import { createEnvSpaceWith, type CreateEnvSpace } from "./space.js";

export * from "./types.js";

export const createEnvSpace: CreateEnvSpace = createEnvSpaceWith({
  optOutOfPrerender: io,
  optsOutInReactServer: cacheComponentsEnabled,
  readContextRawEnv,
});
