import { optOutOfPrerender } from "./dynamic.js";
import { createEnvSpaceWith, type CreateEnvSpace } from "./space.js";

export * from "./types.js";

export const createEnvSpace: CreateEnvSpace = createEnvSpaceWith({
  optOutOfPrerender,
  optsOutInReactServer: true,
});
