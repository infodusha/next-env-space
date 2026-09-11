import { workAsyncStorage } from "next/dist/server/app-render/work-async-storage.external.js";
import { workUnitAsyncStorage } from "next/dist/server/app-render/work-unit-async-storage.external.js";

import { isProduction } from "./process-env.js";

export function isBuildTimeRender(): boolean {
  if (workAsyncStorage.getStore()?.isBuildTimePrerendering === true) {
    return true;
  }

  if (isProduction) {
    return false;
  }

  const type = workUnitAsyncStorage.getStore()?.type;
  return (
    type === "prerender" ||
    type === "prerender-ppr" ||
    type === "prerender-legacy"
  );
}
