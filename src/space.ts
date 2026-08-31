import * as react from "react";

import { parseEnv } from "./parse.js";
import { isProduction } from "./process-env.js";
import { readRawEnv, type EnvRuntime } from "./raw-env.js";
import { isMissingRequestScope } from "./request-scope.js";
import type { EnvSchema, ParsedEnv } from "./schema.js";
import { fulfilled, isFulfilled, rejected } from "./thenable.js";

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

declare const envSpaceBrand: unique symbol;

export interface EnvSpace<TSchema extends EnvSchema = EnvSchema> {
  readonly [envSpaceBrand]: true;
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
  get<TKey extends keyof TSchema>(key: TKey): ParsedEnv<TSchema>[TKey];
  /** Reads the whole space at once, with the same rules as `get`. */
  getAll(): ParsedEnv<TSchema>;
  /**
   * Reads a single variable inside a Server Component. Opts the render out of
   * prerendering first, so the value is always the one of the running server.
   * Where Next has no request to attach to — module scope of a server module,
   * `register()` in instrumentation.ts — there is no prerender either, so it
   * resolves with what the synchronous `get` reads there.
   */
  getAsync<TKey extends keyof TSchema>(
    key: TKey,
  ): Promise<ParsedEnv<TSchema>[TKey]>;
  /** Reads the whole space at once, with the same rules as `getAsync`. */
  getAllAsync(): Promise<ParsedEnv<TSchema>>;
}

/**
 * The parsed values of a space, or of a shape, as one read-only object type.
 *
 * @example
 * type PublicEnv = InferEnv<typeof publicEnv>;
 * type AppName = PublicEnv["APP_NAME"];
 */
export type InferEnv<TEnv extends EnvSchema | AnyEnvSpace> =
  TEnv extends AnyEnvSpace
    ? ParsedEnv<TEnv["schema"]>
    : TEnv extends EnvSchema
      ? ParsedEnv<TEnv>
      : never;

/** Any env space, whatever its shape — what `EnvSpace<TSchema>` narrows to. */
interface AnyEnvSpace {
  readonly [envSpaceBrand]: true;
  readonly schema: EnvSchema;
}

/**
 * The type of `createEnvSpace`. The documentation sits on the call signature,
 * where the editor picks it up for the call itself.
 */
export interface CreateEnvSpace {
  /**
   * Creates an env space: a group of environment variables read from
   * `process.env` at runtime, each validated with its own Standard Schema —
   * zod, valibot, arktype or any other library that implements the spec. The
   * whole space is parsed on the first read and cached for the lifetime of the
   * process.
   *
   * @param schema A shape with one schema per key: `{ FOO: z.string() }`.
   * @param options `name` — the key the raw values are published under on the
   * client. Give every space of the app its own.
   *
   * @example
   * export const publicEnv = createEnvSpace(
   *   { APP_NAME: z.string() },
   *   { name: "public" },
   * );
   */
  <TSchema extends EnvSchema>(
    schema: TSchema,
    options?: EnvSpaceOptions,
  ): EnvSpace<TSchema>;
}

const takenSpaces = new Map<string, readonly string[]>();

const warnedSpaces = new Set<string>();

const readers = new WeakMap<object, () => unknown>();

export function createEnvSpaceWith(runtime: EnvRuntime): CreateEnvSpace {
  return function createEnvSpace<TSchema extends EnvSchema>(
    schema: TSchema,
    options: EnvSpaceOptions = {},
  ): EnvSpace<TSchema> {
    const name = options.name ?? defaultSpaceName;
    const keys = Object.freeze(
      Object.keys(schema) as (keyof TSchema & string)[],
    );

    assertUniqueName(name, keys);
    takenSpaces.set(name, keys);

    let cachedEnv: ParsedEnv<TSchema> | null = null;

    function readAllEnv(fromContext: boolean): ParsedEnv<TSchema> {
      cachedEnv ??= parseEnv(
        schema,
        readRawEnv(runtime, name, fromContext),
        name,
      );
      return cachedEnv;
    }

    function getAll(): ParsedEnv<TSchema> {
      assertNotInRender(name, "getAll()");
      return readAllEnv(false);
    }

    function get<TKey extends keyof TSchema>(
      key: TKey,
    ): ParsedEnv<TSchema>[TKey] {
      assertKnownKey(schema, name, key);
      assertNotInRender(name, `get('${String(key)}')`);
      return readAllEnv(false)[key];
    }

    const settledReads = new Map<keyof TSchema | null, Promise<unknown>>();

    function readAsync<TValue>(
      key: keyof TSchema | null,
      pick: (env: ParsedEnv<TSchema>) => TValue,
    ): Promise<TValue> {
      let optedOut: Promise<void>;
      try {
        optedOut = runtime.optOutOfPrerender();
      } catch (error) {
        if (!isMissingRequestScope(error)) {
          throw error;
        }
        optedOut = fulfilled();
      }

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
        return rejected(error);
      }
    }

    function getAllAsync(): Promise<ParsedEnv<TSchema>> {
      return readAsync(null, (env) => env);
    }

    function getAsync<TKey extends keyof TSchema>(
      key: TKey,
    ): Promise<ParsedEnv<TSchema>[TKey]> {
      assertKnownKey(schema, name, key);
      return readAsync(key, (env) => env[key]);
    }

    const space = {
      name,
      keys,
      schema,
      get,
      getAll,
      getAsync,
      getAllAsync,
    } as EnvSpace<TSchema>;

    readers.set(space, () => readAllEnv(false));

    return space;
  };
}

export function readEnvSpace<TSchema extends EnvSchema>(
  space: EnvSpace<TSchema>,
): ParsedEnv<TSchema> {
  const read = readers.get(space);
  if (read === undefined) {
    throw new Error(
      `Env space "${space.name}" was not created by createEnvSpace() of this package instance.`,
    );
  }
  return read() as ParsedEnv<TSchema>;
}

function assertUniqueName(name: string, keys: readonly string[]): void {
  const taken = takenSpaces.get(name);
  if (taken === undefined || sameKeys(taken, keys)) {
    return;
  }

  const message =
    `Env space "${name}" is created twice with different keys. ` +
    `The one that reaches the browser last replaces the other, so every read of that other one fails. ` +
    `Pass a unique "name" option to createEnvSpace().`;

  if (isProduction()) {
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

function assertKnownKey(
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

function assertNotInRender(name: string, call: string): void {
  if (typeof window !== "undefined" || !isServerRender()) {
    return;
  }

  throw new Error(
    `${call} of the "${name}" env space is called while rendering, so its value can be captured at build time. ` +
      `Use getAsync() instead, or move the read out of the render — a Route Handler, a Server Action, instrumentation.ts. ` +
      `Inside a "use cache" function neither works: pass the value in as an argument.`,
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
