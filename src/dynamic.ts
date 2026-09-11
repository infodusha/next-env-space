import { io } from "next/cache";
import { connection } from "next/server";

import { cacheComponentsEnabled } from "./process-env.js";
import { fulfilled } from "./thenable.js";
import { isCacheScope } from "./work-unit.js";

export function optOutOfPrerender(): Promise<void> {
  if (cacheComponentsEnabled) {
    return io();
  }
  if (isCacheScope()) {
    return fulfilled();
  }
  return connection();
}
