"use client";

import { use } from "react";

import { providedEnv, providedNestedEnv } from "@/env";

/**
 * Reads two spaces that reached the browser through `<UseClientEnv />` context —
 * there is no `__ENV_SPACES__` script on this page at all. The outer space is
 * read from below the inner provider, so a provider that replaced its parent
 * instead of merging would fail here.
 */
export function ProvidedEnvView() {
  countRender();

  const label = use(providedEnv.getAsync("PROVIDED_LABEL"));
  const env = use(providedEnv.getAllAsync());
  const nested = use(providedNestedEnv.getAsync("PROVIDED_NESTED"));

  return (
    <section data-testid="provided-env">
      <p data-testid="provided-label">{label}</p>
      <p data-testid="provided-count">{env.PROVIDED_COUNT}</p>
      <p data-testid="provided-count-type">{typeof env.PROVIDED_COUNT}</p>
      <p data-testid="provided-nested">{nested}</p>
    </section>
  );
}

/** Kept out of the markup: the count differs between the server and the browser. */
function countRender(): void {
  if (typeof window !== "undefined") {
    window.providedEnvRenders = (window.providedEnvRenders ?? 0) + 1;
  }
}
