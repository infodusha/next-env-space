/**
 * The two sets of values the fixture app sees. The build runs with
 * `buildTimeEnv`, the server that serves the tests runs with `runtimeEnv`, so
 * every value the tests assert on proves the read happened at runtime.
 */

export const buildTimeEnv = {
  APP_NAME: "build-time-app",
  REQUEST_TIMEOUT_SECONDS: "97531",
  FEATURE_ENABLED: "FALSE",
  UNSAFE_VALUE: "build-time-unsafe",
  FEATURE_LABEL: "build-time-label",
  UNPUBLISHED_VALUE: "build-time-unpublished",
  SESSION_SECRET: "build-time-session-secret",
  BROKEN_URL: "https://build-time.example.com",
} as const;

export const runtimeEnv = {
  APP_NAME: "runtime-app",
  REQUEST_TIMEOUT_SECONDS: "42",
  FEATURE_ENABLED: "TRUE",
  UNSAFE_VALUE: "</script><script>globalThis.__pwned = true;</script>",
  FEATURE_LABEL: "runtime-label",
  UNPUBLISHED_VALUE: "runtime-unpublished",
  SESSION_SECRET: "runtime-session-secret",
  // Rejected by z.url(), so the space fails on first read.
  BROKEN_URL: "not-a-url",
} as const;

/** Never set anywhere — the space declares it `optional()`. */
export const unsetKey = "APP_VERSION";

export const port = 3210;
