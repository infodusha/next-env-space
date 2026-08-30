"use server";

import { publicEnv } from "@/env";
import { serverEnv } from "@/env.server";

/**
 * A Server Action runs outside a render, so the synchronous `get()` is
 * allowed, and `getAsync()` has to answer next to it all the same.
 */
export async function readEnvAction(): Promise<{
  appName: string;
  appNameAsync: string;
  sessionSecretLength: number;
}> {
  return {
    appName: publicEnv.get("APP_NAME"),
    appNameAsync: await publicEnv.getAsync("APP_NAME"),
    sessionSecretLength: serverEnv.get("SESSION_SECRET").length,
  };
}
