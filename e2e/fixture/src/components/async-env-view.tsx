"use client";

import { use } from "react";

import { asyncEnv } from "@/env";

/**
 * Reads the asynchronous key with `use()`, which suspends until the schema has
 * answered — hence the `<Suspense>` above — and the synchronous key next to it
 * with `get()`, which the asynchronous key refuses.
 */
export function AsyncEnvView() {
  const value = use(asyncEnv.getAsync("ASYNC_VALUE"));

  return (
    <section data-testid="client-async">
      <p data-testid="client-async-value">{value}</p>
      <p data-testid="client-async-sibling">{asyncEnv.get("ASYNC_SIBLING")}</p>
      <p data-testid="client-async-get">
        {attempt(() => asyncEnv.get("ASYNC_VALUE"))}
      </p>
    </section>
  );
}

function attempt(read: () => string): string {
  try {
    return `ok:${read()}`;
  } catch (error) {
    return `err:${error instanceof Error ? error.message : String(error)}`;
  }
}
