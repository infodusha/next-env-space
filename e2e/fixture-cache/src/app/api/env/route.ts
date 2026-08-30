import { connection } from "next/server";

import { publicEnv } from "@/env";
import { serverEnv } from "@/env.server";

/**
 * `get()` and `getAsync()` in a Route Handler — the latter goes through
 * `io()` here, which has to answer outside a render as well. `connection()`
 * keeps the response off the build, where a segment config is not allowed.
 */
export async function GET(): Promise<Response> {
  await connection();
  return Response.json({
    appName: publicEnv.get("APP_NAME"),
    appNameAsync: await publicEnv.getAsync("APP_NAME"),
    requestTimeoutSeconds: publicEnv.get("REQUEST_TIMEOUT_SECONDS"),
    sessionSecret: serverEnv.get("SESSION_SECRET"),
  });
}
