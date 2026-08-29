import "server-only";

import { connection } from "next/server";

import { readProcessEnv } from "./global.js";
import type { EnvSchema, InferEnv } from "./schema.js";
import { readEnvSpace, type EnvSpace } from "./space.js";
import { ClientEnv } from "./client.js";

export async function getEnvAsync<
  TSchema extends EnvSchema,
  TKey extends keyof TSchema,
>(space: EnvSpace<TSchema>, key: TKey): Promise<InferEnv<TSchema>[TKey]> {
  await connection();
  return readEnvSpace(space)[key];
}

export interface WithClientEnvProps<TSchema extends EnvSchema> {
  readonly space: EnvSpace<TSchema>;
}

export async function WithClientEnv<TSchema extends EnvSchema>({
  space,
}: WithClientEnvProps<TSchema>) {
  await connection();
  const processEnv = readProcessEnv();
  const rawEnv = Object.fromEntries(
    space.keys.map((key) => [key, processEnv[key]]),
  );
  return <ClientEnv name={space.name} rawEnv={rawEnv} />;
}
