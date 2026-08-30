import { readBoth } from "@/contexts";

/**
 * Runs in the browser once, as the first page loads, before the app's own
 * code. Whether a read works here comes down to whether that page has already
 * run the env script of `<ClientEnvScript />` — contexts.spec.ts asserts it per
 * route.
 */
window.instrumentationClientReads = await readBoth();
