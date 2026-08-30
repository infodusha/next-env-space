import { type } from "arktype";
import * as v from "valibot";
import * as z from "zod";

import {
  createEnvSpace,
  type CreateEnvSpace,
  type InferEnv,
} from "../src/index.js";
import type * as ClientEntry from "../src/index.js";
import { createEnvSpace as createEnvSpaceRsc } from "../src/index.react-server.js";
import type * as ServerEntry from "../src/index.react-server.js";
import { UseClientEnv, WithClientEnv } from "../src/server.js";

// 1. zod
const publicEnv = createEnvSpace(
  {
    APP_NAME: z.string(),
    APP_VERSION: z.string().optional(),
    REQUEST_TIMEOUT_SECONDS: z.coerce.number(),
    FEATURE_ENABLED: z.stringbool({
      truthy: ["TRUE"],
      falsy: ["FALSE"],
    }),
    SERVICE_URLS: z.preprocess(
      (raw) => JSON.parse(raw as string) as unknown,
      z.record(z.string(), z.string()),
    ),
  },
  { name: "public" },
);

// 2. valibot — any Standard Schema library plugs in the same way
const featureEnv = createEnvSpace(
  {
    NODE_ENV: v.picklist(["production", "development", "test"]),
    FLAG: v.pipe(
      v.string(),
      v.transform((value) => value === "true"),
    ),
  },
  { name: "feature" },
);

// 3. arktype next to zod in one shape — every key brings its own library
const mixedEnv = createEnvSpace(
  {
    PORT: type("string.numeric.parse"),
    HOST: z.string(),
  },
  { name: "mixed" },
);

const appName: string = publicEnv.get("APP_NAME");
const appVersion: string | undefined = publicEnv.get("APP_VERSION");
const timeout: number = publicEnv.get("REQUEST_TIMEOUT_SECONDS");
const featureEnabled: boolean = publicEnv.get("FEATURE_ENABLED");
const serviceUrls: Record<string, string> = publicEnv.get("SERVICE_URLS");
const nodeEnv: "production" | "development" | "test" =
  featureEnv.get("NODE_ENV");
const flag: boolean = featureEnv.get("FLAG");
const port: number = mixedEnv.get("PORT");
const host: string = mixedEnv.get("HOST");
const all: InferEnv<typeof featureEnv.schema> = featureEnv.getAll();

// @ts-expect-error a parsed space is read-only
all.FLAG = false;
// @ts-expect-error the key list is read-only
publicEnv.keys.push("NOPE");

// @ts-expect-error unknown key
publicEnv.get("NOPE");
// @ts-expect-error wrong type
const wrong: number = publicEnv.get("APP_NAME");

// A single object schema is not a shape: Standard Schema exposes no keys.
// @ts-expect-error pass the shape, not z.object() around it
createEnvSpace(z.object({ FOO: z.string() }), { name: "zod-object" });
// @ts-expect-error pass the shape, not v.object() around it
createEnvSpace(v.object({ FOO: v.string() }), { name: "valibot-object" });
// @ts-expect-error every key needs a schema, not a bare value
createEnvSpace({ FOO: "z.string()" }, { name: "bare-value" });
// @ts-expect-error a schema factory has to be called
createEnvSpace({ FOO: z.string }, { name: "uncalled" });

export function Layout() {
  return (
    <>
      <WithClientEnv space={publicEnv} />
      <WithClientEnv space={featureEnv} />
      <WithClientEnv space={mixedEnv} />
      <WithClientEnv space={publicEnv} nonce="r4nd0m" />
      {/* an optional nonce must survive `exactOptionalPropertyTypes` */}
      <WithClientEnv space={publicEnv} nonce={undefined} />
      {/* @ts-expect-error nonce must be a string */}
      <WithClientEnv space={publicEnv} nonce={123} />
      {/* @ts-expect-error space is required */}
      <WithClientEnv />

      <UseClientEnv space={publicEnv}>
        <span />
      </UseClientEnv>
      {/* children are optional, the same way a layout may render none */}
      <UseClientEnv space={featureEnv} />
      {/* @ts-expect-error the context provider takes no nonce */}
      <UseClientEnv space={publicEnv} nonce="r4nd0m" />
      {/* @ts-expect-error space is required */}
      <UseClientEnv>{null}</UseClientEnv>
    </>
  );
}

export {
  appName,
  appVersion,
  timeout,
  featureEnabled,
  serviceUrls,
  nodeEnv,
  flag,
  port,
  host,
  all,
  wrong,
};

// Both entry points must expose exactly the same public type, otherwise the
// `react-server` condition would change the API depending on the layer.

const sameShape: ClientEntry.CreateEnvSpace = createEnvSpaceRsc;
const bothWays: ServerEntry.CreateEnvSpace = createEnvSpace as CreateEnvSpace;

// getAsync is now a method on the space itself
async function methods() {
  const name: string = await publicEnv.getAsync("APP_NAME");
  const everything = await featureEnv.getAllAsync();
  const everythingFlag: boolean = everything.FLAG;
  const asyncPort: number = await mixedEnv.getAsync("PORT");
  // @ts-expect-error unknown key
  await publicEnv.getAsync("NOPE");
  return [name, everythingFlag, asyncPort, sameShape, bothWays] as const;
}

export { methods };
