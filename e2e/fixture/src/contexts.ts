import { publicEnv } from "@/env";

/**
 * The two reads, run wherever the README table puts them, with the outcome
 * folded into a string so a throwing context stays observable instead of
 * failing the build or the request: `ok:<value>` or `err:<message>`.
 */
export function readSync(): string {
  return attempt(() => publicEnv.get("APP_NAME"));
}

export async function readAsync(): Promise<string> {
  try {
    return `ok:${await publicEnv.getAsync("APP_NAME")}`;
  } catch (error) {
    return `err:${describe(error)}`;
  }
}

export interface Reads {
  readonly sync: string;
  readonly async: string;
}

export async function readBoth(): Promise<Reads> {
  return { sync: readSync(), async: await readAsync() };
}

interface InstrumentationGlobal {
  instrumentationReads?: Reads;
}

/** `register()` runs before any request, so its outcome is parked on the process. */
export function rememberInstrumentationReads(reads: Reads): void {
  (globalThis as InstrumentationGlobal).instrumentationReads = reads;
}

export function recallInstrumentationReads(): Reads | undefined {
  return (globalThis as InstrumentationGlobal).instrumentationReads;
}

function attempt(read: () => string): string {
  try {
    return `ok:${read()}`;
  } catch (error) {
    return `err:${describe(error)}`;
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
