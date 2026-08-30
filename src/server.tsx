import "server-only";
import type { ReactNode } from "react";

import { ClientEnv, ClientEnvProvider } from "./client.js";
import { optOutOfPrerender } from "./dynamic.js";
import type { RawEnv } from "./global.js";
import type { EnvSchema } from "./schema.js";
import { readEnvSpace, type EnvSpace } from "./space.js";

export interface WithClientEnvProps<TSchema extends EnvSchema> {
  readonly space: EnvSpace<TSchema>;
  readonly nonce?: string | undefined;
}

export async function WithClientEnv<TSchema extends EnvSchema>({
  space,
  nonce,
}: WithClientEnvProps<TSchema>) {
  const rawEnv = await readRawValues(space);
  return <ClientEnv name={space.name} rawEnv={rawEnv} nonce={nonce} />;
}

export interface UseClientEnvProps<TSchema extends EnvSchema> {
  readonly space: EnvSpace<TSchema>;
  readonly children?: ReactNode;
}

export async function UseClientEnv<TSchema extends EnvSchema>({
  space,
  children,
}: UseClientEnvProps<TSchema>) {
  const rawEnv = await readRawValues(space);
  return (
    <ClientEnvProvider name={space.name} rawEnv={rawEnv}>
      {children}
    </ClientEnvProvider>
  );
}

async function readRawValues<TSchema extends EnvSchema>(
  space: EnvSpace<TSchema>,
): Promise<RawEnv> {
  await optOutOfPrerender();
  readEnvSpace(space);
  return Object.fromEntries(space.keys.map((key) => [key, process.env[key]]));
}
