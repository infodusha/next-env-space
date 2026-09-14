declare const process: {
  readonly env: {
    readonly __NEXT_CACHE_COMPONENTS?: boolean | string;
    readonly NEXT_PHASE?: string;
    readonly NODE_ENV?: string;
  };
};

const hasProcess = typeof process !== "undefined";

const cacheComponents = hasProcess
  ? process.env.__NEXT_CACHE_COMPONENTS
  : undefined;

export const cacheComponentsEnabled: boolean =
  cacheComponents === true || cacheComponents === "true";

export const isProduction: boolean =
  hasProcess && process.env.NODE_ENV === "production";

export function isBuildPhase(): boolean {
  return hasProcess && process.env.NEXT_PHASE === "phase-production-build";
}
