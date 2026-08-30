import type { StandardSchemaV1 } from "@standard-schema/spec";

export type EnvSchema = Record<string, StandardSchemaV1>;

export type ParsedEnv<TSchema extends EnvSchema> = {
  readonly [TKey in keyof TSchema]: StandardSchemaV1.InferOutput<TSchema[TKey]>;
};
