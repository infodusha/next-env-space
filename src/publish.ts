import { envSpacesKey, type RawEnv } from "./global.js";

export function publishToWindow(name: string, rawEnv: RawEnv): void {
  if (typeof window === "undefined") {
    return;
  }

  const spaces = window[envSpacesKey];
  if (spaces?.[name] !== undefined) {
    return;
  }

  window[envSpacesKey] = { ...spaces, [name]: rawEnv };
}

export function createEnvScript(name: string, rawEnv: RawEnv): string {
  const key = serialize(envSpacesKey);
  const space = serialize({ [name]: rawEnv });
  return `window[${key}]=Object.assign(window[${key}]||{},${space});`;
}

function serialize(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
