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

// 1. plain shape
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
      (v) => JSON.parse(v as string) as unknown,
      z.record(z.string(), z.string()),
    ),
  },
  { name: "public" },
);

// 2. z.object()
const featureEnv = createEnvSpace(
  z.object({
    NODE_ENV: z.enum(["production", "development", "test"]),
    FLAG: z.stringbool(),
  }),
  { name: "feature" },
);

const appName: string = publicEnv.get("APP_NAME");
const appVersion: string | undefined = publicEnv.get("APP_VERSION");
const timeout: number = publicEnv.get("REQUEST_TIMEOUT_SECONDS");
const featureEnabled: boolean = publicEnv.get("FEATURE_ENABLED");
const serviceUrls: Record<string, string> = publicEnv.get("SERVICE_URLS");
const nodeEnv: "production" | "development" | "test" =
  featureEnv.get("NODE_ENV");
const all: InferEnv<typeof featureEnv.schema> = featureEnv.getAll();

// @ts-expect-error unknown key
publicEnv.get("NOPE");
// @ts-expect-error wrong type
const wrong: number = publicEnv.get("APP_NAME");

export function Layout() {
  return (
    <>
      <WithClientEnv space={publicEnv} />
      <WithClientEnv space={featureEnv} />
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
  const flag: boolean = everything.FLAG;
  // @ts-expect-error unknown key
  await publicEnv.getAsync("NOPE");
  return [name, flag, sameShape, bothWays] as const;
}

export { methods };
