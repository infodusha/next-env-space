import * as react from "react";
import type * as z from "zod";

import { parseEnv } from "./parse.js";
import { isProduction } from "./process-env.js";
import { readRawEnv, type EnvRuntime } from "./raw-env.js";
import {
  toEnvShape,
  type EnvSchema,
  type EnvSchemaInput,
  type InferEnv,
} from "./schema.js";
import { fulfilled, isFulfilled } from "./thenable.js";

const defaultSpaceName = "default";

export interface EnvSpaceOptions {
  /**
   * Unique name of the space. Used as the key the raw values are published
   * under on the client, so every space in an app needs its own name.
   *
   * @default "default"
   */
  readonly name?: string;
}

export interface EnvSpace<TSchema extends EnvSchema = EnvSchema> {
  readonly name: string;
  readonly keys: readonly (keyof TSchema & string)[];
  readonly schema: TSchema;
  /**
   * Reads a single variable. Safe at module scope, in client components, in
   * Route Handlers and in Server Actions. Throws inside a Server Component
   * render, a dynamic one included, where the value could be captured at build
   * time — use `getAsync` there. Throws as well on a key the schema has not
   * declared.
   */
  get<TKey extends keyof TSchema>(key: TKey): InferEnv<TSchema>[TKey];
  /** Reads the whole space at once, with the same rules as `get`. */
  getAll(): InferEnv<TSchema>;
  /**
   * Reads a single variable inside a Server Component. Opts the render out of
   * prerendering first, so the value is always the one of the running server.
   */
  getAsync<TKey extends keyof TSchema>(
    key: TKey,
  ): Promise<InferEnv<TSchema>[TKey]>;
  /** Reads the whole space at once, with the same rules as `getAsync`. */
  getAllAsync(): Promise<InferEnv<TSchema>>;
}

export interface CreateEnvSpace {
  <TSchema extends EnvSchema>(
    schema: TSchema,
    options?: EnvSpaceOptions,
  ): EnvSpace<TSchema>;
  <TSchema extends EnvSchema>(
    schema: z.ZodObject<TSchema>,
    options?: EnvSpaceOptions,
  ): EnvSpace<TSchema>;
}

const takenSpaces = new Map<string, readonly string[]>();

const readers = new WeakMap<object, () => unknown>();

export function createEnvSpaceWith(runtime: EnvRuntime): CreateEnvSpace {
  return function createEnvSpace<TSchema extends EnvSchema>(
    schema: EnvSchemaInput<TSchema>,
    options: EnvSpaceOptions = {},
  ): EnvSpace<TSchema> {
    const name = options.name ?? defaultSpaceName;
    const shape = toEnvShape(schema, name);
    const keys = Object.keys(shape) as (keyof TSchema & string)[];

    assertUniqueName(name, keys);
    takenSpaces.set(name, keys);

    let cachedEnv: InferEnv<TSchema> | null = null;

    function readAllEnv(fromContext: boolean): InferEnv<TSchema> {
      cachedEnv ??= parseEnv(shape, readRawEnv(runtime, name, fromContext));
      return cachedEnv;
    }

    function getAll(): InferEnv<TSchema> {
      assertNotInRender(name, "getAll()");
      return readAllEnv(false);
    }

    function get<TKey extends keyof TSchema>(
      key: TKey,
    ): InferEnv<TSchema>[TKey] {
      assertKnownKey(shape, name, key);
      assertNotInRender(name, `get('${String(key)}')`);
      return readAllEnv(false)[key];
    }

    const settledReads = new Map<keyof TSchema | null, Promise<unknown>>();

    function readAsync<TValue>(
      key: keyof TSchema | null,
      pick: (env: InferEnv<TSchema>) => TValue,
    ): Promise<TValue> {
      const optedOut = runtime.optOutOfPrerender();

      if (!isFulfilled(optedOut)) {
        return optedOut.then(() => {
          assertOptedOut(runtime, name);
          return pick(readAllEnv(true));
        });
      }

      const remembered = settledReads.get(key);
      if (remembered !== undefined) {
        return remembered as Promise<TValue>;
      }

      try {
        assertOptedOut(runtime, name);
        const promise = fulfilled(pick(readAllEnv(true)));
        settledReads.set(key, promise);
        return promise;
      } catch (error) {
        return Promise.reject(error);
      }
    }

    function getAllAsync(): Promise<InferEnv<TSchema>> {
      return readAsync(null, (env) => env);
    }

    function getAsync<TKey extends keyof TSchema>(
      key: TKey,
    ): Promise<InferEnv<TSchema>[TKey]> {
      assertKnownKey(shape, name, key);
      return readAsync(key, (env) => env[key]);
    }

    const space: EnvSpace<TSchema> = {
      name,
      keys,
      schema: shape,
      get,
      getAll,
      getAsync,
      getAllAsync,
    };

    readers.set(space, () => readAllEnv(false));

    return space;
  };
}

export function readEnvSpace<TSchema extends EnvSchema>(
  space: EnvSpace<TSchema>,
): InferEnv<TSchema> {
  if (!isEnvSpaceLike(space)) {
    throw new Error(
      `The "space" prop needs an env space created by createEnvSpace().`,
    );
  }

  const read = readers.get(space);
  if (read === undefined) {
    throw new Error(
      `Env space "${space.name}" was not created by createEnvSpace() of this package instance.`,
    );
  }
  return read() as InferEnv<TSchema>;
}

function isEnvSpaceLike(space: unknown): boolean {
  return (
    typeof space === "object" &&
    space !== null &&
    typeof (space as { name?: unknown }).name === "string"
  );
}

function assertUniqueName(name: string, keys: readonly string[]): void {
  const taken = takenSpaces.get(name);
  if (taken === undefined) {
    return;
  }

  if (isProduction() && !sameKeys(taken, keys)) {
    throw new Error(
      `Env space "${name}" is created twice with different keys. ` +
        `The one that reaches the browser last replaces the other, so every read of that other one fails. ` +
        `Pass a unique "name" option to createEnvSpace().`,
    );
  }

  console.warn(
    `Env space "${name}" is created more than once. ` +
      `Pass a unique "name" option to createEnvSpace() so the spaces do not overwrite each other on the client.`,
  );
}

function sameKeys(taken: readonly string[], keys: readonly string[]): boolean {
  return (
    taken.length === keys.length && keys.every((key) => taken.includes(key))
  );
}

function assertKnownKey(
  shape: EnvSchema,
  name: string,
  key: PropertyKey,
): void {
  if (Object.hasOwn(shape, key)) {
    return;
  }

  const known = Object.keys(shape);
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

function assertNotInRender(name: string, call: string): void {
  if (typeof window !== "undefined" || !isServerRender()) {
    return;
  }

  throw new Error(
    `${call} of the "${name}" env space is called while rendering, so its value can be captured at build time. ` +
      `Use getAsync() instead, or read it at module scope.`,
  );
}

function assertOptedOut(runtime: EnvRuntime, name: string): void {
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
