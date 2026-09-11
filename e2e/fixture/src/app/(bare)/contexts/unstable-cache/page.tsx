import { unstable_cache } from "next/cache";

import { readBoth } from "@/contexts";

/**
 * Inside `unstable_cache()` on a page nothing keeps off the build, the callback
 * runs while `next build` fills the cache: both reads are rejected by the guard
 * that names the cached function, and its messages are what the build caches
 * and bakes into the static HTML.
 */
const readInUnstableCache = unstable_cache(readBoth, [
  "contexts-unstable-cache",
]);

export default async function UnstableCachePage() {
  const reads = await readInUnstableCache();

  return (
    <section>
      <p data-testid="unstable-cache-sync">{reads.sync}</p>
      <p data-testid="unstable-cache-async">{reads.async}</p>
    </section>
  );
}
