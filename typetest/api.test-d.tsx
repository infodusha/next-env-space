import * as z from "zod";

import {
  createEnvSpace,
  type CreateEnvSpace,
  type InferEnv,
} from "../src/index.js";
import type * as ClientEntry from "../src/index.js";
import { createEnvSpace as createEnvSpaceRsc } from "../src/index.react-server.js";
import type * as ServerEntry from "../src/index.react-server.js";
import { getEnvAsync, WithClientEnv } from "../src/server.js";

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

const appName: string = publicEnv.getEnv("APP_NAME");
const appVersion: string | undefined = publicEnv.getEnv("APP_VERSION");
const timeout: number = publicEnv.getEnv("REQUEST_TIMEOUT_SECONDS");
const featureEnabled: boolean = publicEnv.getEnv("FEATURE_ENABLED");
const serviceUrls: Record<string, string> = publicEnv.getEnv("SERVICE_URLS");
const nodeEnv: "production" | "development" | "test" =
  featureEnv.getEnv("NODE_ENV");
const all: InferEnv<typeof featureEnv.schema> = featureEnv.getAllEnv();

// @ts-expect-error unknown key
publicEnv.getEnv("NOPE");
// @ts-expect-error wrong type
const wrong: number = publicEnv.getEnv("APP_NAME");

async function server() {
  const name: string = await getEnvAsync(publicEnv, "APP_NAME");
  const flag: boolean = await getEnvAsync(featureEnv, "FLAG");
  // @ts-expect-error unknown key
  await getEnvAsync(featureEnv, "APP_NAME");
  return [name, flag] as const;
}

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
  server,
};

// Both entry points must expose exactly the same public type, otherwise the
// `react-server` condition would change the API depending on the layer.

const sameShape: ClientEntry.CreateEnvSpace = createEnvSpaceRsc;
const bothWays: ServerEntry.CreateEnvSpace = createEnvSpace as CreateEnvSpace;

// getEnvAsync is now a method on the space itself
async function methods() {
  const name: string = await publicEnv.getEnvAsync("APP_NAME");
  const everything = await featureEnv.getAllEnvAsync();
  const flag: boolean = everything.FLAG;
  // @ts-expect-error unknown key
  await publicEnv.getEnvAsync("NOPE");
  return [name, flag, sameShape, bothWays] as const;
}

export { methods };
