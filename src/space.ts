import { isErrorDocumentReadError, reportAfterBoot } from "./error-document.js";
import {
  assertKnownKey,
  assertNotInRender,
  assertOptedOut,
  claimName,
} from "./guards.js";
import { assertNotMisused } from "./misuse.js";
import { parseEnv } from "./parse.js";
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
   * Route Handlers and in Server Actions. Throws where `next build` would
   * capture the value — a Server Component it prerenders, `generateStaticParams`,
   * a cached function, a Route Handler it prerenders; use `getAsync` in the
   * component. Throws as well on a key the schema has not declared, and on a
   * space that did not reach the browser — except on the
   * error document Next serves for a failed server render, where it answers
   * `undefined` and reports the missing space once the page has booted, so a
   * read at module scope of instrumentation-client.ts does not stop that boot.
   */
  get<TKey extends keyof TSchema>(key: TKey): ParsedEnv<TSchema>[TKey];
  /** Reads the whole space at once, with the same rules as `get`. */
  getAll(): ParsedEnv<TSchema>;
  /**
   * Reads a single variable inside a Server Component. Opts the render out of
   * prerendering first, so the value is always the one of the running server.
   * Where Next has no request to attach to — module scope of a server module,
   * `register()` in instrumentation.ts — there is no prerender either, so it
   * resolves with what the synchronous `get` reads there. Throws where there
   * is nothing to opt out of and `next build` would capture the value all the
   * same: `generateStaticParams`, a cached function, a Route Handler it
   * prerenders.
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

    claimName(name, keys);

    let cachedEnv: ParsedEnv<TSchema> | null = null;

    function readAllEnv(fromContext: boolean): ParsedEnv<TSchema> {
      cachedEnv ??= parseEnv(
        schema,
        readRawEnv(runtime, name, fromContext),
        name,
      );
      return cachedEnv;
    }

    function readSyncEnv(): ParsedEnv<TSchema> | undefined {
      try {
        return readAllEnv(false);
      } catch (error) {
        if (!isErrorDocumentReadError(error)) {
          throw error;
        }
        reportAfterBoot(name, error);
        return undefined;
      }
    }

    function noValues(): ParsedEnv<TSchema> {
      return Object.freeze(
        Object.fromEntries(keys.map((key) => [key, undefined])),
      ) as never;
    }

    function getAll(): ParsedEnv<TSchema> {
      assertNotMisused(name, "getAll()");
      assertNotInRender(name, "getAll()");
      return readSyncEnv() ?? noValues();
    }

    function get<TKey extends keyof TSchema>(
      key: TKey,
    ): ParsedEnv<TSchema>[TKey] {
      assertKnownKey(schema, name, key);
      const call = `get('${String(key)}')`;
      assertNotMisused(name, call);
      assertNotInRender(name, call);
      return readSyncEnv()?.[key] as ParsedEnv<TSchema>[TKey];
    }

    const settledReads = new Map<keyof TSchema | null, Promise<unknown>>();

    function readAsync<TValue>(
      call: string,
      key: keyof TSchema | null,
      pick: (env: ParsedEnv<TSchema>) => TValue,
    ): Promise<TValue> {
      assertNotMisused(name, call);

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
      return readAsync("getAllAsync()", null, (env) => env);
    }

    function getAsync<TKey extends keyof TSchema>(
      key: TKey,
    ): Promise<ParsedEnv<TSchema>[TKey]> {
      assertKnownKey(schema, name, key);
      return readAsync(`getAsync('${String(key)}')`, key, (env) => env[key]);
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
