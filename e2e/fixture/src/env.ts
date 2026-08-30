import { createEnvSpace } from "next-env-space";
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

/** A second public space, to prove spaces stay independent. */
export const featureEnv = createEnvSpace(
  z.object({
    FEATURE_LABEL: z.string(),
  }),
  { name: "feature" },
);

/** Never rendered with `<WithClientEnv />`, so a client read has to fail. */
export const unpublishedEnv = createEnvSpace(
  {
    UNPUBLISHED_VALUE: z.string(),
  },
  { name: "unpublished" },
);
