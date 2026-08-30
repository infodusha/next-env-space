import { io } from "next/cache";
import { connection } from "next/server";

import { cacheComponentsEnabled } from "./cache-components.js";

export function optOutOfPrerender(): Promise<void> {
  return cacheComponentsEnabled ? io() : connection();
}
