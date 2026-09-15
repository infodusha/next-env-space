import { readSync } from "@/contexts";
import { publicEnv } from "@/env";

/**
 * No `dynamic` config, so the build tries to prerender it: the guard rejects
 * `get()` into the folded string, and `getAsync()` reaches connection(), which
 * bails the route out of the prerender — it is not caught here, so that Next
 * sees the bailout and serves the route at request time.
 */
export async function GET(): Promise<Response> {
  return Response.json({
    sync: readSync(),
    async: `ok:${await publicEnv.getAsync("APP_NAME")}`,
  });
}
