import { createEnvSpace } from "next-env-space";
import * as z from "zod";

/** Read on the server only — its values must never reach the browser. */
export const serverEnv = createEnvSpace(
  {
    SESSION_SECRET: z.string().min(8),
  },
  { name: "server" },
);
