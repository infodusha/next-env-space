import { currentWorkUnit, isBuildTime } from "./work-unit.js";

type Misuse = "generate-static-params" | "cached-function" | "static-route";

const cacheStores: ReadonlySet<string> = new Set([
  "cache",
  "private-cache",
  "unstable-cache",
]);

function detectMisuse(): Misuse | null {
  const unit = currentWorkUnit();
  if (unit === undefined) {
    return null;
  }

  if (unit.type === "generate-static-params") {
    return "generate-static-params";
  }

  if (!isBuildTime(unit)) {
    return null;
  }

  if (cacheStores.has(unit.type)) {
    return "cached-function";
  }

  if (unit.phase === "action" && unit.type !== "request") {
    return "static-route";
  }

  return null;
}

export function assertNotMisused(name: string, call: string): void {
  const misuse = detectMisuse();
  if (misuse === null) {
    return;
  }

  throw new Error(misuseMessage(misuse, `${call} of the "${name}" env space`));
}

function misuseMessage(misuse: Misuse, read: string): string {
  switch (misuse) {
    case "generate-static-params":
      return (
        `${read} is called inside generateStaticParams, which only runs at build time, so the value could only be the build machine's. ` +
        `Compute the params without it, and read the value where they are used — getAsync() in the page, get() in a Route Handler.`
      );
    case "cached-function":
      return (
        `${read} is called inside a cached function — "use cache" or unstable_cache() — while the build fills the cache, so every request would be served the build machine's value. ` +
        `Read the value outside and pass it in as an argument.`
      );
    case "static-route":
      return (
        `${read} is called in a Route Handler while Next prerenders it at build time, so the value would be captured into the static response. ` +
        `Make the handler dynamic — await connection() before the read, or drop dynamic = "force-static".`
      );
  }
}
