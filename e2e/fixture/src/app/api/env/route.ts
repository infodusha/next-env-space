import { publicEnv } from "@/env";
import { serverEnv } from "@/env.server";

export const dynamic = "force-dynamic";

/** Synchronous `getEnv()` outside a render. */
export function GET(): Response {
  return Response.json({
    appName: publicEnv.getEnv("APP_NAME"),
    requestTimeoutSeconds: publicEnv.getEnv("REQUEST_TIMEOUT_SECONDS"),
    featureEnabled: publicEnv.getEnv("FEATURE_ENABLED"),
    sessionSecret: serverEnv.getEnv("SESSION_SECRET"),
  });
}
