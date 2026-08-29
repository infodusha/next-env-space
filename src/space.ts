import * as react from "react";
import type * as z from "zod";

import { envSpacesKey, readProcessEnv, type RawEnv } from "./global.js";
import { parseEnv } from "./parse.js";
import {
  toEnvShape,
  type EnvSchema,
  type EnvSchemaInput,
  type InferEnv,
} from "./schema.js";

const defaultSpaceName = "default";

export interface EnvSpaceOptions {
  readonly name?: string;
}

export interface EnvSpace<TSchema extends EnvSchema = EnvSchema> {
  readonly name: string;
  readonly keys: readonly (keyof TSchema & string)[];
  readonly schema: TSchema;
  getEnv<TKey extends keyof TSchema>(key: TKey): InferEnv<TSchema>[TKey];
  getAllEnv(): InferEnv<TSchema>;
}

const takenNames = new Set<string>();

export function createEnvSpace<TSchema extends EnvSchema>(
  schema: TSchema,
  options?: EnvSpaceOptions,
): EnvSpace<TSchema>;
export function createEnvSpace<TSchema extends EnvSchema>(
  schema: z.ZodObject<TSchema>,
  options?: EnvSpaceOptions,
): EnvSpace<TSchema>;
export function createEnvSpace<TSchema extends EnvSchema>(
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

  function getAllEnv(): InferEnv<TSchema> {
    assertNotInRender(name, "getAllEnv()");
    return readAllEnv();
  }

  function readAllEnv(): InferEnv<TSchema> {
    cachedEnv ??= parseEnv(shape, readRawEnv(name));
    return cachedEnv;
  }

  function getEnv<TKey extends keyof TSchema>(
    key: TKey,
  ): InferEnv<TSchema>[TKey] {
    assertNotInRender(name, `getEnv('${String(key)}')`);
    return readAllEnv()[key];
  }

  const space: EnvSpace<TSchema> = {
    name,
    keys,
    schema: shape,
    getEnv,
    getAllEnv,
  };

  readers.set(space, readAllEnv);

  return space;
}

const readers = new WeakMap<object, () => unknown>();

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

function readRawEnv(name: string): RawEnv {
  if (typeof window === "undefined") {
    return readProcessEnv();
  }

  const rawEnv = window[envSpacesKey]?.[name];
  if (rawEnv === undefined) {
    throw new Error(
      `Env space "${name}" is missing on the client. ` +
        `Render <WithClientEnv space={...} /> from "next-env-space/server" in your layout.`,
    );
  }
  return rawEnv;
}

function assertNotInRender(name: string, call: string): void {
  if (typeof window !== "undefined") {
    return;
  }

  if (typeof react.cacheSignal !== "function" || react.cacheSignal() === null) {
    return;
  }

  throw new Error(
    `${call} of the "${name}" env space is called while rendering, so its value can be captured at build time. ` +
      `Use getEnvAsync(space, key) from "next-env-space/server" instead, or read it at module scope.`,
  );
}
