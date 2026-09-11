import { publicEnv } from "@/env";

/**
 * Read at module scope of a module that only a dynamic `import()` inside a
 * static page loads: the module is evaluated during that page's build-time
 * prerender, inside the render, where the guard has to reject the read —
 * whatever it answered would be baked into the static HTML.
 */
export const lazyStaticAppName = publicEnv.get("APP_NAME");
