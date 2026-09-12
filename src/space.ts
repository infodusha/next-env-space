import { isErrorDocumentReadError, reportAfterBoot } from "./error-document.js";
import type { RawEnv } from "./global.js";
import {
  assertKnownKey,
  assertOptedOut,
  assertReadAllowed,
  claimName,
} from "./guards.js";
import { parseEnv, type ParsedSpace } from "./parse.js";
import { readRawEnv, type EnvRuntime, type ReadContext } from "./raw-env.js";
import { isMissingRequestScope } from "./request-scope.js";
import type { EnvSchema, ParsedEnv } from "./schema.js";
import { fulfilled, isFulfilled, rejectOnThrow } from "./thenable.js";

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
   * component. Throws as well on a key the schema has not declared, on a key
   * whose schema validates asynchronously — only `getAsync` reads that one —
   * and on a space that did not reach the browser — except on the
   * error document Next serves for a failed server render, where it answers
   * `undefined` and reports the missing space once the page has booted, so a
   * read at module scope of instrumentation-client.ts does not stop that boot.
   */
  get<TKey extends keyof TSchema>(key: TKey): ParsedEnv<TSchema>[TKey];
  /**
   * Reads the whole space at once, with the same rules as `get`: one key whose
   * schema validates asynchronously is enough for it to throw.
   */
  getAll(): ParsedEnv<TSchema>;
  /**
   * Reads a single variable inside a Server Component. Opts the render out of
   * prerendering first, so the value is always the one of the running server.
   * Where Next has no request to attach to — module scope of a server module,
   * `register()` in instrumentation.ts, a cached function the running server
   * fills — there is no prerender either, so it resolves with what the
   * synchronous `get` reads there. Rejects where there is nothing to opt out
   * of and `next build` would capture the value all the same —
   * `generateStaticParams`, a cached function, a Route Handler it prerenders —
   * and on a key the schema has not declared. Every failure is a rejection,
   * never a synchronous throw. Waits for a schema that validates
   * asynchronously, and is the only read that answers such a key.
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
   * process. A key whose schema validates asynchronously is read with
   * `getAsync` alone.
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

export interface ShippedEnv {
  readonly rawEnv: RawEnv;
  readonly failure: Error | undefined;
}

const shippers = new WeakMap<object, () => Promise<ShippedEnv>>();

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

    let cached: ParsedSpace<TSchema> | null = null;

    function parseOnce(rawEnv: RawEnv): ParsedSpace<TSchema> {
      cached ??= parseEnv(schema, rawEnv, name);
      return cached;
    }

    function readAllEnv(readContext: ReadContext | null): ParsedSpace<TSchema> {
      return cached ?? parseOnce(readRawEnv(name, readContext));
    }

    function readSyncEnv(): ParsedSpace<TSchema> | undefined {
      try {
        return readAllEnv(null);
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
      assertReadAllowed(name, "getAll()", true);
      return readSyncEnv()?.getAll() ?? noValues();
    }

    function get<TKey extends keyof TSchema>(
      key: TKey,
    ): ParsedEnv<TSchema>[TKey] {
      assertKnownKey(schema, name, key);
      assertReadAllowed(name, `get('${String(key)}')`, true);
      return readSyncEnv()?.get(key) as ParsedEnv<TSchema>[TKey];
    }

    function optOutOfPrerender(): Promise<void> {
      try {
        return runtime.optOutOfPrerender();
      } catch (error) {
        if (!isMissingRequestScope(error)) {
          throw error;
        }
        return fulfilled();
      }
    }

    function readAsync<TValue>(
      call: string,
      read: (parsed: ParsedSpace<TSchema>) => Promise<TValue>,
    ): Promise<TValue> {
      assertReadAllowed(name, call, false);

      const optedOut = optOutOfPrerender();
      if (isFulfilled(optedOut)) {
        assertOptedOut(runtime, name);
        return read(readAllEnv(runtime.readContextRawEnv));
      }

      return optedOut.then(() => {
        assertOptedOut(runtime, name);
        return read(readAllEnv(runtime.readContextRawEnv));
      });
    }

    function getAllAsync(): Promise<ParsedEnv<TSchema>> {
      return rejectOnThrow(() =>
        readAsync("getAllAsync()", (parsed) => parsed.getAllAsync()),
      );
    }

    function getAsync<TKey extends keyof TSchema>(
      key: TKey,
    ): Promise<ParsedEnv<TSchema>[TKey]> {
      return rejectOnThrow(() => {
        assertKnownKey(schema, name, key);
        return readAsync(`getAsync('${String(key)}')`, (parsed) =>
          parsed.getAsync(key),
        );
      });
    }

    async function ship(): Promise<ShippedEnv> {
      const source = readRawEnv(name, null);
      const rawEnv = Object.fromEntries(keys.map((key) => [key, source[key]]));
      try {
        await parseOnce(source).getAllAsync();
        return { rawEnv, failure: undefined };
      } catch (error) {
        return {
          rawEnv,
          failure: error instanceof Error ? error : new Error(String(error)),
        };
      }
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

    shippers.set(space, ship);

    return space;
  };
}

export function readShippedEnv<TSchema extends EnvSchema>(
  space: EnvSpace<TSchema>,
): Promise<ShippedEnv> {
  const ship = shippers.get(space);
  if (ship === undefined) {
    throw new Error(
      `Env space "${space.name}" was not created by createEnvSpace() of this package instance.`,
    );
  }
  return ship();
}
