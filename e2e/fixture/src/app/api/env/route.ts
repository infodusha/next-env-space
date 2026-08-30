import { publicEnv } from "@/env";
import { serverEnv } from "@/env.server";

export const dynamic = "force-dynamic";

/** Synchronous `get()` outside a render, with `getAsync()` beside it. */
export async function GET(): Promise<Response> {
  return Response.json({
    appName: publicEnv.get("APP_NAME"),
    appNameAsync: await publicEnv.getAsync("APP_NAME"),
    requestTimeoutSeconds: publicEnv.get("REQUEST_TIMEOUT_SECONDS"),
    featureEnabled: publicEnv.get("FEATURE_ENABLED"),
    sessionSecret: serverEnv.get("SESSION_SECRET"),
  });
}
