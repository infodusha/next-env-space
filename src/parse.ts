import type { RawEnv } from "./global.js";
import type { EnvSchema, InferEnv } from "./schema.js";

export function parseEnv<TSchema extends EnvSchema>(
  schema: TSchema,
  rawEnv: RawEnv,
): InferEnv<TSchema> {
  const env: Record<string, unknown> = {};
  for (const [key, type] of Object.entries(schema)) {
    const parseResult = type.safeParse(rawEnv[key]);
    if (!parseResult.success) {
      const reason = parseResult.error.issues
        .map((issue) => issue.message)
        .join("; ");
      throw new Error(`Environment variable ${key} is not valid: ${reason}`);
    }
    env[key] = parseResult.data;
  }
  return env as InferEnv<TSchema>;
}
