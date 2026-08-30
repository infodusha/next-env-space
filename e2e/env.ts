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
  PROVIDED_LABEL: "build-time-provided",
  PROVIDED_COUNT: "13579",
  PROVIDED_NESTED: "build-time-late",
  SESSION_SECRET: "build-time-session-secret",
  BROKEN_URL: "https://build-time.example.com",
  BROKEN_COUNT: "86420",
} as const;

export const runtimeEnv = {
  APP_NAME: "runtime-app",
  REQUEST_TIMEOUT_SECONDS: "42",
  FEATURE_ENABLED: "TRUE",
  UNSAFE_VALUE: "</script><script>globalThis.__pwned = true;</script>",
  FEATURE_LABEL: "runtime-label",
  UNPUBLISHED_VALUE: "runtime-unpublished",
  PROVIDED_LABEL: "runtime-provided",
  PROVIDED_COUNT: "24",
  PROVIDED_NESTED: "runtime-late",
  SESSION_SECRET: "runtime-session-secret",
  // Rejected by z.url(), so the space fails on first read.
  BROKEN_URL: "not-a-url",
  // Rejected by z.coerce.number(), to fail alongside BROKEN_URL.
  BROKEN_COUNT: "not-a-number",
} as const;

/** Never set anywhere — the space declares it `optional()`. */
export const unsetKey = "APP_VERSION";

/** One server per fixture: the plain app and the Cache Components one. */
export const ports = {
  plain: 3210,
  cache: 3211,
} as const;
