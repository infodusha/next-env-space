import { readBoth, rememberInstrumentationReads } from "@/contexts";

/** Runs once as the server starts, outside any request — /api/contexts/instrumentation reports it. */
export async function register(): Promise<void> {
  rememberInstrumentationReads(await readBoth());
}
