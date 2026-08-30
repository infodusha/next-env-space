import type * as z from "zod";

import type { RawEnv } from "./global.js";
import type { EnvSchema, InferEnv } from "./schema.js";

interface InvalidValue {
  readonly key: string;
  readonly reason: string;
}

export function parseEnv<TSchema extends EnvSchema>(
  schema: TSchema,
  rawEnv: RawEnv,
  name: string,
): InferEnv<TSchema> {
  const env: Record<string, unknown> = {};
  const invalid: InvalidValue[] = [];

  for (const [key, type] of Object.entries(schema)) {
    const parseResult = type.safeParse(rawEnv[key]);
    if (parseResult.success) {
      env[key] = parseResult.data;
    } else {
      invalid.push({ key, reason: describeIssues(parseResult.error.issues) });
    }
  }

  if (invalid.length > 0) {
    throw new Error(invalidMessage(name, invalid));
  }

  return Object.freeze(env) as InferEnv<TSchema>;
}

function invalidMessage(name: string, invalid: InvalidValue[]): string {
  const [first] = invalid;
  if (invalid.length === 1 && first !== undefined) {
    return `Environment variable ${first.key} of the "${name}" env space is not valid: ${first.reason}`;
  }

  const lines = invalid.map(({ key, reason }) => `  ${key}: ${reason}`);
  return (
    `${invalid.length} environment variables of the "${name}" env space are not valid:\n` +
    lines.join("\n")
  );
}

function describeIssues(issues: readonly z.core.$ZodIssue[]): string {
  return issues.map((issue) => describeIssue(issue)).join("; ");
}

function describeIssue(issue: z.core.$ZodIssue): string {
  const path = issue.path.map(String).join(".");
  return path === "" ? issue.message : `${issue.message} (at ${path})`;
}
