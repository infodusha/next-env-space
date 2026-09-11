import { publicEnv } from "@/env";

/**
 * Inside "use cache" the body runs once, during the build, and its return
 * value is what every request gets. Both reads are rejected by the guard that
 * names the cached function, so the trap of a captured value never opens; the
 * messages themselves are what gets cached and rendered here.
 */
async function readInCache(): Promise<{ sync: string; async: string }> {
  "use cache";
  return {
    sync: attempt(() => publicEnv.get("APP_NAME")),
    async: await attemptAsync(),
  };
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

function attempt(read: () => string): string {
  try {
    return `ok:${read()}`;
  } catch (error) {
    return `err:${describe(error)}`;
  }
}

async function attemptAsync(): Promise<string> {
  try {
    return `ok:${await publicEnv.getAsync("APP_NAME")}`;
  } catch (error) {
    return `err:${describe(error)}`;
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
