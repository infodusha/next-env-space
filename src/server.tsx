import "server-only";
import type { ReactNode } from "react";

import { EnvScript, EnvProvider } from "./client.js";
import { optOutOfPrerender } from "./dynamic.js";
import type { RawEnv } from "./global.js";
import type { EnvSchema } from "./schema.js";
import { readEnvSpace, type EnvSpace } from "./space.js";

export interface ClientEnvScriptProps<TSchema extends EnvSchema> {
  /** The env space to ship, created by `createEnvSpace()`. */
  readonly space: EnvSpace<TSchema>;
  /** Put on the inline `<script>` tag, for a `script-src 'nonce-...'` CSP. */
  readonly nonce?: string | undefined;
}

/**
 * Ships one env space to the browser in an inline `<script>`, before any
 * client module is evaluated — or from the browser itself when a client-side
 * navigation is what mounts it. Everything in the space becomes public, so
 * keep secrets in a space this never renders.
 *
 * Render it once per space, in a layout above the client components that read
 * the space. Serves every read, the synchronous `get()` included.
 */
export async function ClientEnvScript<TSchema extends EnvSchema>({
  space,
  nonce,
}: ClientEnvScriptProps<TSchema>) {
  const rawEnv = await readRawValues(space);
  return <EnvScript name={space.name} rawEnv={rawEnv} nonce={nonce} />;
}

export interface ClientEnvProviderProps<TSchema extends EnvSchema> {
  /** The env space to ship, created by `createEnvSpace()`. */
  readonly space: EnvSpace<TSchema>;
  readonly children?: ReactNode;
}

/**
 * Ships one env space to the browser through React context instead of an
 * inline `<script>`: nothing is written into the document, so there is no
 * nonce to pass and no `script-src` to widen — but only `getAsync()` /
 * `getAllAsync()` can read it, and only while a component below it renders.
 *
 * Wrap it around the tree that reads the space; a second space nests inside
 * the first. Everything in the space still becomes public.
 */
export async function ClientEnvProvider<TSchema extends EnvSchema>({
  space,
  children,
}: ClientEnvProviderProps<TSchema>) {
  const rawEnv = await readRawValues(space);
  return (
    <EnvProvider name={space.name} rawEnv={rawEnv}>
      {children}
    </EnvProvider>
  );
}

async function readRawValues<TSchema extends EnvSchema>(
  space: EnvSpace<TSchema>,
): Promise<RawEnv> {
  await optOutOfPrerender();
  readEnvSpace(space);
  return Object.fromEntries(space.keys.map((key) => [key, process.env[key]]));
}
