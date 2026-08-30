import "server-only";
import { ClientEnv } from "./client.js";
import { optOutOfPrerender } from "./dynamic.js";
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
  await optOutOfPrerender();
  readEnvSpace(space);
  const rawEnv = Object.fromEntries(
    space.keys.map((key) => [key, process.env[key]]),
  );
  return <ClientEnv name={space.name} rawEnv={rawEnv} nonce={nonce} />;
}
