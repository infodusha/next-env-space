"use client";

import { featureEnv, publicEnv } from "@/env";

/** Reads both public spaces the way a client component would. */
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
      <p data-testid="client-feature-enabled-type">
        {typeof env.FEATURE_ENABLED}
      </p>
      <p data-testid="client-unsafe-value">{env.UNSAFE_VALUE}</p>
      <p data-testid="client-feature-label">
        {featureEnv.get("FEATURE_LABEL")}
      </p>
    </section>
  );
}
