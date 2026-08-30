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
  },
  { name: "public" },
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
