import * as react from "react";

import { isBuildTimeRender } from "./build-time.js";
import { isProduction } from "./process-env.js";
import type { EnvRuntime } from "./raw-env.js";
import type { EnvSchema } from "./schema.js";

const takenSpaces = new Map<string, readonly string[]>();

const warnedSpaces = new Set<string>();

export function claimName(name: string, keys: readonly string[]): void {
  const taken = takenSpaces.get(name);
  takenSpaces.set(name, keys);

  if (taken === undefined || sameKeys(taken, keys)) {
    return;
  }

  const message =
    `Env space "${name}" is created twice with different keys. ` +
    `The one that reaches the browser last replaces the other, so every read of that other one fails. ` +
    `Pass a unique "name" option to createEnvSpace().`;

  if (isProduction) {
    throw new Error(message);
  }

  if (warnedSpaces.has(name)) {
    return;
  }
  warnedSpaces.add(name);
  console.warn(message);
}

function sameKeys(taken: readonly string[], keys: readonly string[]): boolean {
  return (
    taken.length === keys.length && keys.every((key) => taken.includes(key))
  );
}

export function assertKnownKey(
  schema: EnvSchema,
  name: string,
  key: PropertyKey,
): void {
  if (Object.hasOwn(schema, key)) {
    return;
  }

  const known = Object.keys(schema);
  throw new Error(
    `Key "${String(key)}" is not in the "${name}" env space. ` +
      (known.length === 0
        ? "The space has no keys."
        : `It has ${known.join(", ")}.`),
  );
}

function isServerRender(): boolean {
  return (
    typeof react.cacheSignal === "function" && react.cacheSignal() !== null
  );
}

export function assertNotInRender(name: string, call: string): void {
  if (
    typeof window !== "undefined" ||
    !isServerRender() ||
    !isBuildTimeRender()
  ) {
    return;
  }

  throw new Error(
    `${call} of the "${name}" env space is called while prerendering, so its value would be baked into the build output. ` +
      `Use getAsync() instead, or move the read out of the render — a Route Handler, a Server Action, instrumentation.ts. ` +
      `Inside a "use cache" function neither works: pass the value in as an argument.`,
  );
}

export function assertOptedOut(runtime: EnvRuntime, name: string): void {
  if (runtime.optsOutInReactServer || !isServerRender()) {
    return;
  }

  throw new Error(
    `getAsync() of the "${name}" env space could not opt the render out of prerendering: ` +
      `"next-env-space" was resolved without the "react-server" export condition, leaving it ` +
      `with io(), which is only a boundary under cacheComponents. ` +
      `Turn cacheComponents on, or find what resolves the package without that condition.`,
  );
}
