import { connection } from "next/server";

import { readBoth, type Reads } from "@/contexts";

/**
 * The same cached function, filled by the running server: `connection()`
 * keeps the page off the build, so the first request is the cache miss that
 * runs the body, and the token tells a later hit from a rerun. The guard
 * rejects only the fill `next build` does, so both reads see the runtime
 * value here.
 */
async function readInRuntimeCache(): Promise<Reads & { token: string }> {
  "use cache";
  return { ...(await readBoth()), token: crypto.randomUUID() };
}

export default async function Page() {
  await connection();
  const reads = await readInRuntimeCache();
  return (
    <section>
      <p data-testid="use-cache-runtime-sync">{reads.sync}</p>
      <p data-testid="use-cache-runtime-async">{reads.async}</p>
      <p data-testid="use-cache-runtime-token">{reads.token}</p>
    </section>
  );
}
