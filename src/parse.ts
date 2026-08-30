import type { StandardSchemaV1 } from "@standard-schema/spec";

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
    const result = validate(type, rawEnv[key], name, key);
    if (result.issues) {
      invalid.push({ key, reason: describeIssues(result.issues) });
    } else {
      env[key] = result.value;
    }
  }

  if (invalid.length > 0) {
    throw new Error(invalidMessage(name, invalid));
  }

  return Object.freeze(env) as InferEnv<TSchema>;
}

function validate(
  type: StandardSchemaV1,
  value: string | undefined,
  name: string,
  key: string,
): StandardSchemaV1.Result<unknown> {
  const result = type["~standard"].validate(value);
  if (isThenable(result)) {
    throw new Error(
      `Key "${key}" of the "${name}" env space validates asynchronously. ` +
        `Environment variables are parsed on the spot, so give the key a schema without async refinements.`,
    );
  }
  return result;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
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

function describeIssues(issues: readonly StandardSchemaV1.Issue[]): string {
  return issues.map((issue) => describeIssue(issue)).join("; ");
}

function describeIssue(issue: StandardSchemaV1.Issue): string {
  const path = Array.from(issue.path ?? [], (segment) =>
    segmentKey(segment),
  ).join(".");
  return path === "" ? issue.message : `${issue.message} (at ${path})`;
}

function segmentKey(
  segment: PropertyKey | StandardSchemaV1.PathSegment,
): string {
  return String(typeof segment === "object" ? segment.key : segment);
}
