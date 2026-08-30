"use client";

import { publicEnv } from "@/env";

/**
 * Reads the public space synchronously, the way a client component would.
 * When this sits in the static part of a route, the prerender bakes the build
 * machine's values into the shell — the documented trap — and the published
 * script heals them on hydration.
 */
export function PublicEnvView() {
  const env = publicEnv.getAll();

  return (
    <section data-testid="client-env">
      <p data-testid="client-app-name">{env.APP_NAME}</p>
      <p data-testid="client-app-version">{env.APP_VERSION ?? "(unset)"}</p>
      <p data-testid="client-timeout">{env.REQUEST_TIMEOUT_SECONDS}</p>
      <p data-testid="client-timeout-type">
        {typeof env.REQUEST_TIMEOUT_SECONDS}
      </p>
      <p data-testid="client-feature-enabled">{String(env.FEATURE_ENABLED)}</p>
    </section>
  );
}
