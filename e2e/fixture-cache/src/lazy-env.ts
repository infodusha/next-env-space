import { publicEnv } from "@/env";

/**
 * Read at module scope of a module that only a dynamic `import()` inside a
 * Server Component loads: the module is evaluated during that component's
 * render, inside the request scope of the Flight render, where the render
 * guard cannot tell this read from one written into the component body.
 */
export const lazyAppName = publicEnv.get("APP_NAME");
