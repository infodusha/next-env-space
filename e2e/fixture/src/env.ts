import { createEnvSpace } from "next-env-space";
import * as v from "valibot";
import * as z from "zod";

/** Shipped to the browser by the `(published)` layout. */
export const publicEnv = createEnvSpace(
  {
    APP_NAME: z.string(),
    APP_VERSION: z.string().optional(),
    REQUEST_TIMEOUT_SECONDS: z.coerce.number(),
    FEATURE_ENABLED: z.stringbool({
      truthy: ["TRUE"],
      falsy: ["FALSE"],
    }),
    // Carries markup that must not break out of the inline <script>.
    UNSAFE_VALUE: z.string(),
  },
  { name: "public" },
);

/**
 * A second public space, to prove spaces stay independent — declared with
 * valibot, to prove any Standard Schema library works.
 */
export const featureEnv = createEnvSpace(
  {
    FEATURE_LABEL: v.string(),
  },
  { name: "feature" },
);

/** Never rendered with `<ClientEnvScript />`, so a client read has to fail. */
export const unpublishedEnv = createEnvSpace(
  {
    UNPUBLISHED_VALUE: z.string(),
  },
  { name: "unpublished" },
);

/** Carried by `<ClientEnvProvider />` context only — never written into the document. */
export const providedEnv = createEnvSpace(
  {
    PROVIDED_LABEL: z.string(),
    PROVIDED_COUNT: z.coerce.number(),
  },
  { name: "provided" },
);

/** Provided by a second, nested `<ClientEnvProvider />` — it has to merge, not replace. */
export const providedNestedEnv = createEnvSpace(
  {
    PROVIDED_NESTED: z.string(),
  },
  { name: "provided-nested" },
);

/**
 * Published by the `(broken)` layout, but backed by a value the schema rejects:
 * the raw value still has to reach the browser, so a read there fails on the
 * validation error rather than on a missing space.
 */
export const brokenPublicEnv = createEnvSpace(
  {
    BROKEN_URL: z.url(),
  },
  { name: "broken-public" },
);
