import type { StandardSchemaV1 } from "@standard-schema/spec";

export type EnvSchema = Record<string, StandardSchemaV1>;

export type InferEnv<TSchema extends EnvSchema> = {
  readonly [TKey in keyof TSchema]: StandardSchemaV1.InferOutput<TSchema[TKey]>;
};

const shapeExample = "{ FOO: z.string() }";

export function assertEnvShape(schema: unknown, name: string): void {
  if (isStandardSchema(schema)) {
    throw new Error(
      `Env space "${name}" was created with a single ${schema["~standard"].vendor} schema. ` +
        `Pass a shape with a Standard Schema per key, as in ${shapeExample}.`,
    );
  }

  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
    throw new Error(
      `Env space "${name}" needs a shape with a Standard Schema per key, as in ${shapeExample}.`,
    );
  }

  for (const [key, type] of Object.entries(schema)) {
    if (!isStandardSchema(type)) {
      throw new Error(badKeyMessage(name, key, type));
    }
  }
}

function badKeyMessage(name: string, key: string, type: unknown): string {
  const hint =
    typeof type === "function"
      ? `Call it, as in { ${key}: z.string() }.`
      : `Every key parses with its own Standard Schema, as in { ${key}: z.string() }.`;

  return (
    `Key "${key}" of the "${name}" env space is not a Standard Schema. ` + hint
  );
}

interface StandardCandidate {
  readonly "~standard"?: {
    readonly version?: unknown;
    readonly validate?: unknown;
  };
}

/**
 * A Standard Schema is any value carrying a `~standard` object with the
 * version and a `validate()` — an arktype type is a function, so a plain
 * `typeof === "object"` check would turn one away.
 */
function isStandardSchema(value: unknown): value is StandardSchemaV1 {
  if (
    (typeof value !== "object" && typeof value !== "function") ||
    value === null
  ) {
    return false;
  }

  const props = (value as StandardCandidate)["~standard"];
  return (
    typeof props === "object" &&
    props !== null &&
    props.version === 1 &&
    typeof props.validate === "function"
  );
}
