"use client";

import { use } from "react";

import { featureEnv, publicEnv } from "@/env";

/**
 * Reads the spaces through `use()`, which needs a promise that is already
 * settled and the same on every render — otherwise React suspends on it, and
 * says so on the console in development.
 */
export function UseEnvView() {
  countRender();

  const appName = use(publicEnv.getAsync("APP_NAME"));
  const env = use(publicEnv.getAllAsync());
  const featureLabel = use(featureEnv.getAsync("FEATURE_LABEL"));

  return (
    <section data-testid="use-env">
      <p data-testid="use-app-name">{appName}</p>
      <p data-testid="use-timeout">{env.REQUEST_TIMEOUT_SECONDS}</p>
      <p data-testid="use-timeout-type">{typeof env.REQUEST_TIMEOUT_SECONDS}</p>
      <p data-testid="use-feature-label">{featureLabel}</p>
    </section>
  );
}

/**
 * Kept out of the markup: the count differs between the server and the browser,
 * and rendering it would be a hydration mismatch of the test's own making.
 */
function countRender(): void {
  if (typeof window !== "undefined") {
    window.useEnvRenders = (window.useEnvRenders ?? 0) + 1;
  }
}
