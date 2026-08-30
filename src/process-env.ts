declare const process: {
  readonly env: {
    readonly __NEXT_CACHE_COMPONENTS?: boolean | string;
    readonly NODE_ENV?: string;
  };
};

const hasProcess = typeof process !== "undefined";

const cacheComponents = hasProcess
  ? process.env.__NEXT_CACHE_COMPONENTS
  : undefined;

export const cacheComponentsEnabled: boolean =
  cacheComponents === true || cacheComponents === "true";

export function isProduction(): boolean {
  return hasProcess && process.env.NODE_ENV === "production";
}
