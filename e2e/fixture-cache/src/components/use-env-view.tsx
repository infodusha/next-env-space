"use client";

import { use } from "react";

import { publicEnv } from "@/env";

/**
 * Reads the space through `use()`, which needs a promise that is already
 * settled and the same on every render — otherwise React suspends on it.
 */
export function UseEnvView() {
  countRender();

  const appName = use(publicEnv.getAsync("APP_NAME"));
  const env = use(publicEnv.getAllAsync());

  return (
    <section data-testid="use-env">
      <p data-testid="use-app-name">{appName}</p>
      <p data-testid="use-timeout">{env.REQUEST_TIMEOUT_SECONDS}</p>
      <p data-testid="use-timeout-type">{typeof env.REQUEST_TIMEOUT_SECONDS}</p>
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
