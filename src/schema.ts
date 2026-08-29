import type * as z from "zod";

export type EnvSchema = Record<string, z.ZodType>;

export type EnvSchemaInput<TSchema extends EnvSchema> =
  | TSchema
  | z.ZodObject<TSchema>;

export type InferEnv<TSchema extends EnvSchema> = {
  [TKey in keyof TSchema]: z.infer<TSchema[TKey]>;
};

export function toEnvShape<TSchema extends EnvSchema>(
  schema: EnvSchemaInput<TSchema>,
): TSchema {
  return isZodObject(schema) ? schema.shape : schema;
}

function isZodObject<TSchema extends EnvSchema>(
  schema: EnvSchemaInput<TSchema>,
): schema is z.ZodObject<TSchema> {
  const candidate = schema as { shape?: unknown; safeParse?: unknown };
  return (
    typeof candidate.safeParse === "function" &&
    typeof candidate.shape === "object"
  );
}
