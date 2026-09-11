import * as z from "zod";

import type { EnvRuntime } from "../../dist/raw-env.js";
import type { EnvSchema } from "../../dist/schema.js";
import { createEnvSpaceWith, type EnvSpace } from "../../dist/space.js";
import { fulfilled } from "../../dist/thenable.js";

let counter = 0;

/** A fresh name per space: the name registry is process-wide, and a repeat with other keys warns. */
export function uniqueName(prefix = "unit"): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

/** A runtime whose opt-out is already fulfilled, like the browser's `io()`. */
export function runtimeWith(overrides: Partial<EnvRuntime> = {}): EnvRuntime {
  return {
    optOutOfPrerender: () => fulfilled(),
    optsOutInReactServer: true,
    readContextRawEnv: null,
    ...overrides,
  };
}

export interface CreateSpaceOptions {
  readonly name?: string;
  readonly runtime?: EnvRuntime;
}

export function createSpace<TSchema extends EnvSchema>(
  schema: TSchema,
  options: CreateSpaceOptions = {},
): EnvSpace<TSchema> {
  const createEnvSpace = createEnvSpaceWith(options.runtime ?? runtimeWith());
  return createEnvSpace(schema, { name: options.name ?? uniqueName() });
}

/** The fields React's `use()` reads off a settled thenable. */
export interface Settled {
  readonly status?: unknown;
  readonly value?: unknown;
  readonly reason?: unknown;
}

export function settled(promise: Promise<unknown>): Settled {
  return promise as unknown as Settled;
}

/** The shape most tests read; `createReadySpace` sets its variables so a read succeeds. */
export const unitShape = {
  UNIT_NAME: z.string(),
  UNIT_COUNT: z.coerce.number(),
  UNIT_OPTIONAL: z.string().optional(),
};

export function createReadySpace(
  runtime: EnvRuntime = runtimeWith(),
): EnvSpace<typeof unitShape> {
  process.env.UNIT_NAME = "app";
  process.env.UNIT_COUNT = "42";
  delete process.env.UNIT_OPTIONAL;
  return createSpace(unitShape, { runtime });
}
