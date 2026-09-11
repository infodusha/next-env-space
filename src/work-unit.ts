import { workAsyncStorage } from "next/dist/server/app-render/work-async-storage.external.js";
import {
  workUnitAsyncStorage,
  type WorkUnitStore,
} from "next/dist/server/app-render/work-unit-async-storage.external.js";

import { isProduction } from "./process-env.js";

export function currentWorkUnit(): WorkUnitStore | undefined {
  return workUnitAsyncStorage.getStore();
}

const cacheStores: ReadonlySet<string> = new Set([
  "cache",
  "private-cache",
  "unstable-cache",
]);

export function isCacheScope(
  unit: WorkUnitStore | undefined = currentWorkUnit(),
): boolean {
  return unit !== undefined && cacheStores.has(unit.type);
}

const buildLikePrerenders: ReadonlySet<string> = new Set([
  "prerender",
  "prerender-ppr",
  "prerender-legacy",
]);

export function isBuildTime(
  unit: WorkUnitStore | undefined = currentWorkUnit(),
): boolean {
  if (workAsyncStorage.getStore()?.isBuildTimePrerendering === true) {
    return true;
  }

  return (
    !isProduction && unit !== undefined && buildLikePrerenders.has(unit.type)
  );
}
