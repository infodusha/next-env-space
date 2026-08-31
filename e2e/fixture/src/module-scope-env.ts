import { publicEnv } from "@/env";

/**
 * Read at module scope, the way the README calls safe: the module is evaluated
 * again in the server process, so this constant holds the runtime value there.
 * The build must survive this module being evaluated during a prerender.
 */
export const moduleScopeAppName = publicEnv.get("APP_NAME");

/**
 * The same read through a top-level `await`. With no request to attach to,
 * getAsync() skips the prerender opt-out and resolves with what get() reads,
 * so this constant must always agree with the one above — and the build must
 * survive the module all the same.
 */
export const moduleScopeAppNameAsync = await publicEnv.getAsync("APP_NAME");
