import { publicEnv } from "@/env";

/**
 * Read at module scope of a module that only the prefetched page imports, so
 * the first request to evaluate it can be a prefetch. There Next stops the
 * component tree at the loading boundary above the page, and what imports the
 * page depends on the Next version: 16.3 loads every segment module ahead of
 * the render, an older one left that to the metadata resolution — inside the
 * Flight render, where the render guard has to let this read through.
 */
export const prefetchedAppName = publicEnv.get("APP_NAME");

/** The same read through a top-level `await`, which has to agree with it. */
export const prefetchedAppNameAsync = await publicEnv.getAsync("APP_NAME");
