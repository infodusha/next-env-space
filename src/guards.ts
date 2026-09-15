import * as react from "react";

import { isProduction } from "./process-env.js";
import type { EnvRuntime } from "./raw-env.js";
import type { EnvSchema } from "./schema.js";
import {
  currentWorkUnit,
  isBuildTime,
  isCacheScope,
  isPinnedStatic,
} from "./work-unit.js";

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

export function assertReadAllowed(
  name: string,
  call: string,
  sync: boolean,
): void {
  if (typeof window !== "undefined") {
    return;
  }

  const read = `${call} of the "${name}" env space`;
  const unit = currentWorkUnit();

  if (unit?.type === "generate-static-params") {
    throw new Error(
      `${read} is called inside generateStaticParams, which only runs at build time, so the value could only be the build machine's. ` +
        `Compute the params without it, and read the value where they are used — getAsync() in the page, get() in a Route Handler.`,
    );
  }

  if (!isBuildTime(unit)) {
    return;
  }

  if (isCacheScope(unit)) {
    throw new Error(
      `${read} is called inside a cached function — "use cache" or unstable_cache() — while the build fills the cache, so every request would be served the build machine's value. ` +
        `Read the value outside and pass it in as an argument.`,
    );
  }

  if (
    unit !== undefined &&
    unit.phase === "action" &&
    unit.type !== "request"
  ) {
    const pinned = isPinnedStatic();
    if (!sync && !pinned) {
      return;
    }

    throw new Error(
      `${read} is called in a Route Handler while Next prerenders it at build time, so the value would be captured into the static response. ` +
        (pinned
          ? `Its dynamic = "force-static" or "error" keeps connection() from opting the route out, so drop that config, or read the value outside and pass it in. `
          : `Use getAsync(), which opts the route out of prerendering, or await connection() before the read. `) +
        `Next prerenders every Route Handler that reads no request data, the metadata routes — /favicon.ico, /manifest.*, /robots.txt, /sitemap.xml — among them. ` +
        `The read may also sit at the module scope of a module the handler imports lazily, where it runs inside the prerender.`,
    );
  }

  if (sync && isServerRender()) {
    throw new Error(
      `${read} is called while prerendering, so its value would be baked into the build output. ` +
        `Use getAsync() instead, or move the read out of the render — a Route Handler, a Server Action, instrumentation.ts. ` +
        `Inside a "use cache" function neither works: pass the value in as an argument.`,
    );
  }
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
