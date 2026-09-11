import { unstable_cache } from "next/cache";

import { readBoth, type Reads } from "@/contexts";

/**
 * The same cached function, filled by the running server: the route is
 * dynamic, so the first request is the cache miss that runs the callback, and
 * the token tells a later hit from a rerun. The build never ran this, so the
 * guard stays quiet and both reads see the runtime value.
 */
export const dynamic = "force-dynamic";

const readInUnstableCache = unstable_cache(
  async (): Promise<Reads & { token: string }> => ({
    ...(await readBoth()),
    token: crypto.randomUUID(),
  }),
  ["contexts-unstable-cache-runtime"],
);

export async function GET(): Promise<Response> {
  return Response.json(await readInUnstableCache());
}
