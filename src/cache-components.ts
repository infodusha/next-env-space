declare const process: {
  readonly env: { readonly __NEXT_CACHE_COMPONENTS?: boolean | string };
};

const hasProcess = process !== undefined;

const flag = hasProcess ? process.env.__NEXT_CACHE_COMPONENTS : undefined;

export const cacheComponentsEnabled: boolean = flag === true || flag === "true";
