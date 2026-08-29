import { connection } from "next/server";

import { createEnvSpaceWith, type CreateEnvSpace } from "./space.js";

export * from "./types.js";

export const createEnvSpace: CreateEnvSpace = createEnvSpaceWith({
  connection,
  isReactServer: true,
});
