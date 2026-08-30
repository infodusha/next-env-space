export const envSpacesKey = "__ENV_SPACES__" as const;

export type RawEnv = Record<string, string | undefined>;

declare global {
  interface Window {
    [envSpacesKey]?: Record<string, RawEnv | undefined>;
  }
}
