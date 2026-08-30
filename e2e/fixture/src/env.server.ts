import { createEnvSpace } from "next-env-space";
import * as z from "zod";

/** Read on the server only — its values must never reach the browser. */
export const serverEnv = createEnvSpace(
  {
    SESSION_SECRET: z.string().min(8),
  },
  { name: "server" },
);

/** Backed by a value that does not match the schema. */
export const brokenEnv = createEnvSpace(
  {
    BROKEN_URL: z.url(),
  },
  { name: "broken" },
);
