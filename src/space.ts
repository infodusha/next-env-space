import * as react from "react";
import type * as z from "zod";

import { envSpacesKey, type RawEnv } from "./global.js";
import { parseEnv } from "./parse.js";
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
   * Reads a single variable. Safe at module scope, in client components and in
   * server code that already opted out of prerendering. Throws when called
   * while a Server Component renders — use `getAsync` there.
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

export interface EnvRuntime {
  readonly optOutOfPrerender: () => Promise<void>;
  readonly optsOutInReactServer: boolean;
  readonly readContextRawEnv: ((name: string) => RawEnv | undefined) | null;
}

const takenNames = new Set<string>();

const readers = new WeakMap<object, () => unknown>();

export function createEnvSpaceWith(runtime: EnvRuntime): CreateEnvSpace {
  return function createEnvSpace<TSchema extends EnvSchema>(
    schema: EnvSchemaInput<TSchema>,
    options: EnvSpaceOptions = {},
  ): EnvSpace<TSchema> {
    const shape = toEnvShape(schema);
    const name = options.name ?? defaultSpaceName;
    const keys = Object.keys(shape) as (keyof TSchema & string)[];

    if (takenNames.has(name)) {
      console.warn(
        `Env space "${name}" is created more than once. ` +
          `Pass a unique "name" option to createEnvSpace() so the spaces do not overwrite each other on the client.`,
      );
    }
    takenNames.add(name);

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
  const read = readers.get(space);
  if (read === undefined) {
    throw new Error(
      `Env space "${space.name}" was not created by createEnvSpace() of this package instance.`,
    );
  }
  return read() as InferEnv<TSchema>;
}

function readRawEnv(
  runtime: EnvRuntime,
  name: string,
  fromContext: boolean,
): RawEnv {
  if (typeof window === "undefined") {
    return process.env;
  }

  const published = window[envSpacesKey]?.[name];
  if (published !== undefined) {
    return published;
  }

  const provided = fromContext ? readProvidedEnv(runtime, name) : undefined;
  if (provided !== undefined) {
    return provided;
  }

  throw new Error(
    `Env space "${name}" is missing on the client. ` +
      `Render <WithClientEnv space={...} /> or <UseClientEnv space={...}> from ` +
      `"next-env-space/server" above the components that read it.`,
  );
}

function readProvidedEnv(
  runtime: EnvRuntime,
  name: string,
): RawEnv | undefined {
  const read = runtime.readContextRawEnv;
  if (read === null) {
    return undefined;
  }

  try {
    return read(name);
  } catch {
    throw new Error(
      `getAsync() of the "${name}" env space was called outside of a render, ` +
        `where the <UseClientEnv> context cannot be read. Publish the space with ` +
        `<WithClientEnv space={...} /> instead — it lands before any component runs.`,
    );
  }
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
