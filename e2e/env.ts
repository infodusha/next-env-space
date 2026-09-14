/**
 * The values the fixture app sees. `next build` runs with none of them set —
 * the build the README promises — and the server that serves the tests runs
 * with `runtimeEnv`, so every value a test asserts on proves the read happened
 * at runtime.
 */

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
