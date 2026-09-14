import { publicEnv } from "@/env";

/**
 * Read at module scope, the way the README calls safe: the module is evaluated
 * again in the server process, so this constant holds the runtime value there.
 * The build has to survive this module being evaluated with no variable set —
 * under Cache Components as much as without them: next build parses nothing,
 * so the constant holds undefined there.
 */
export const moduleScopeAppName = publicEnv.get("APP_NAME");
