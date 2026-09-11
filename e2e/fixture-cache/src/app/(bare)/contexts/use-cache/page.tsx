import { readBoth, type Reads } from "@/contexts";

/**
 * Inside "use cache" the body runs once, during the build, and its return
 * value is what every request gets. Both reads are rejected by the guard that
 * names the cached function, so the trap of a captured value never opens; the
 * messages themselves are what gets cached and rendered here.
 */
async function readInCache(): Promise<Reads> {
  "use cache";
  return await readBoth();
}

export default async function Page() {
  const reads = await readInCache();
  return (
    <section>
      <p data-testid="use-cache-sync">{reads.sync}</p>
      <p data-testid="use-cache-async">{reads.async}</p>
    </section>
  );
}
