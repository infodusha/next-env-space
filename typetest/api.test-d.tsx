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
import { ClientEnvProvider, ClientEnvScript } from "../src/server.js";

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
const all: InferEnv<typeof featureEnv> = featureEnv.getAll();
// InferEnv takes the space itself, or its shape — both name the same type.
const allFromShape: InferEnv<typeof featureEnv.schema> = all;
type PublicEnv = InferEnv<typeof publicEnv>;
const oneOfAll: PublicEnv["REQUEST_TIMEOUT_SECONDS"] = timeout;
// @ts-expect-error InferEnv picks the type of the key, not string
const notAString: string = all.FLAG;
// @ts-expect-error neither a space nor a shape
type NotAnEnv = InferEnv<string>;

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

// An object of the right shape is still not an env space: the type is branded,
// so only what createEnvSpace() returns fits the `space` prop.
const handRolled = {
  name: "hand-rolled",
  keys: [] as const,
  schema: {},
  get: publicEnv.get,
  getAll: publicEnv.getAll,
  getAsync: publicEnv.getAsync,
  getAllAsync: publicEnv.getAllAsync,
};

export function Layout() {
  return (
    <>
      <ClientEnvScript space={publicEnv} />
      {/* @ts-expect-error only createEnvSpace() produces an env space */}
      <ClientEnvScript space={handRolled} />
      {/* @ts-expect-error the same brand guards the context provider */}
      <ClientEnvProvider space={handRolled} />
      <ClientEnvScript space={featureEnv} />
      <ClientEnvScript space={mixedEnv} />
      <ClientEnvScript space={publicEnv} nonce="r4nd0m" />
      {/* an optional nonce must survive `exactOptionalPropertyTypes` */}
      <ClientEnvScript space={publicEnv} nonce={undefined} />
      {/* @ts-expect-error nonce must be a string */}
      <ClientEnvScript space={publicEnv} nonce={123} />
      {/* @ts-expect-error space is required */}
      <ClientEnvScript />

      <ClientEnvProvider space={publicEnv}>
        <span />
      </ClientEnvProvider>
      {/* children are optional, the same way a layout may render none */}
      <ClientEnvProvider space={featureEnv} />
      {/* @ts-expect-error the context provider takes no nonce */}
      <ClientEnvProvider space={publicEnv} nonce="r4nd0m" />
      {/* @ts-expect-error space is required */}
      <ClientEnvProvider>{null}</ClientEnvProvider>
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
  allFromShape,
  oneOfAll,
  notAString,
  wrong,
};
export type { NotAnEnv };

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
