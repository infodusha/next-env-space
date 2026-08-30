import { publicEnv } from "@/env";

/**
 * Read at module scope, the way the README calls safe: the module is evaluated
 * again in the server process, so this constant holds the runtime value there.
 * The build must survive this module being evaluated during a prerender —
 * under Cache Components as much as without them.
 */
export const moduleScopeAppName = publicEnv.get("APP_NAME");
