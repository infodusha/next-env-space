import { publicEnv } from "@/env";

/**
 * The two reads, run wherever the README table puts them, with the outcome
 * folded into a string so a throwing context stays observable instead of
 * failing the build or the request: `ok:<value>` or `err:<message>`.
 */
export function readSync(): string {
  try {
    return `ok:${publicEnv.get("APP_NAME")}`;
  } catch (error) {
    return `err:${describe(error)}`;
  }
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

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
