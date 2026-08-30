import type * as z from "zod";

export type EnvSchema = Record<string, z.ZodType>;

export type EnvSchemaInput<TSchema extends EnvSchema> =
  | TSchema
  | z.ZodObject<TSchema>;

export type InferEnv<TSchema extends EnvSchema> = {
  readonly [TKey in keyof TSchema]: z.infer<TSchema[TKey]>;
};

interface SchemaCandidate {
  readonly shape?: unknown;
  readonly safeParse?: unknown;
  readonly def?: { readonly type?: unknown } | undefined;
}

export function toEnvShape<TSchema extends EnvSchema>(
  schema: EnvSchemaInput<TSchema>,
  name: string,
): TSchema {
  if (isZodObject(schema)) {
    return schema.shape;
  }

  assertEnvShape(schema, name);
  return schema;
}

function isZodObject<TSchema extends EnvSchema>(
  schema: EnvSchemaInput<TSchema>,
): schema is z.ZodObject<TSchema> {
  const candidate = schema as SchemaCandidate;
  return isZodType(schema) && typeof candidate.shape === "object";
}

function assertEnvShape(schema: unknown, name: string): void {
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
    throw new Error(
      `Env space "${name}" needs a shape ({ FOO: z.string() }) ` +
        `or a z.object() around one.`,
    );
  }

  if (isZodType(schema)) {
    throw new Error(
      `Env space "${name}" was created with a ${zodTypeName(schema)} schema. ` +
        `Pass a shape ({ FOO: z.string() }) or a z.object() around one.`,
    );
  }

  for (const [key, type] of Object.entries(schema)) {
    if (!isZodType(type)) {
      throw new Error(badKeyMessage(name, key, type));
    }
  }
}

function badKeyMessage(name: string, key: string, type: unknown): string {
  const hint =
    typeof type === "function"
      ? `Call it, as in { ${key}: z.string() }.`
      : `Every key parses with its own type, as in { ${key}: z.string() }.`;

  return `Key "${key}" of the "${name}" env space is not a zod type. ` + hint;
}

function isZodType(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as SchemaCandidate).safeParse === "function"
  );
}

function zodTypeName(schema: unknown): string {
  const type = (schema as SchemaCandidate).def?.type;
  return typeof type === "string" ? `z.${type}()` : "zod";
}
