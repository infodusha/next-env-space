import { io } from "next/cache";
import { connection } from "next/server";

import { cacheComponentsEnabled } from "./process-env.js";

export function optOutOfPrerender(): Promise<void> {
  return cacheComponentsEnabled ? io() : connection();
}
