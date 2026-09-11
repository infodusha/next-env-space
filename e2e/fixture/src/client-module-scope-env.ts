import { publicEnv } from "@/env";

/**
 * Read at module scope of a module the browser evaluates: it is imported by a
 * client component only, so it is part of the client bundle, and its module
 * scope runs twice — once on the server, in the SSR pass, where the reads
 * answer from `process.env`, and once in the browser, where they answer from
 * the script `<ClientEnvScript />` wrote ahead of every chunk. Both have to
 * hold the runtime value, or hydration trips on the difference.
 */
export const clientModuleAppName = publicEnv.get("APP_NAME");

/** The same read through a top-level `await`, which has to agree with it. */
export const clientModuleAppNameAsync = await publicEnv.getAsync("APP_NAME");
