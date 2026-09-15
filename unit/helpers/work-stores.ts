import {
  workAsyncStorage,
  type WorkStore,
} from "next/dist/server/app-render/work-async-storage.external.js";
import {
  workUnitAsyncStorage,
  type WorkUnitStore,
} from "next/dist/server/app-render/work-unit-async-storage.external.js";

/** The two fields of a work unit the package looks at. */
export interface Unit {
  readonly type: WorkUnitStore["type"];
  readonly phase?: "action" | "render" | "after";
}

/** Runs `run` inside a Next work unit — a request, a prerender, a cached function. */
export function inWorkUnit<TResult>(unit: Unit, run: () => TResult): TResult {
  const store = { phase: "render", ...unit } as unknown as WorkUnitStore;
  return workUnitAsyncStorage.run(store, run);
}

/**
 * Runs `run` the way `next build` does: under a work store that says the build
 * output is being written. `store` adds what the route's config sets on it —
 * `forceStatic`, `dynamicShouldError`.
 */
export function atBuildTime<TResult>(
  run: () => TResult,
  store: Partial<WorkStore> = {},
): TResult {
  const workStore = {
    route: "/unit",
    isBuildTimePrerendering: true,
    ...store,
  } as unknown as WorkStore;
  return workAsyncStorage.run(workStore, run);
}
