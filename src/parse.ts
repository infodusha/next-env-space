import type { StandardSchemaV1 } from "@standard-schema/spec";

import type { RawEnv } from "./global.js";
import type { EnvSchema, ParsedEnv } from "./schema.js";
import { chain, fulfilled, rejected, tracked } from "./thenable.js";

type Result = StandardSchemaV1.Result<unknown>;

/** What the schema of one key answered, once it has. */
type Outcome = readonly [key: string, result: Result];

interface InvalidValue {
  readonly key: string;
  readonly reason: string;
}

/**
 * A space run against its raw values — every schema once, on the spot — with
 * the four reads of the space itself, minus the guards and the raw values.
 */
export interface ParsedSpace<TSchema extends EnvSchema> {
  /**
   * The value of one key, as its schema produced it on the spot. Throws when a
   * value that validated on the spot is invalid, and on a key whose schema
   * validates asynchronously — only `getAsync` reads that one.
   */
  get<TKey extends keyof TSchema>(key: TKey): ParsedEnv<TSchema>[TKey];
  /** Every value on the spot, with the same rules: one asynchronous key is enough to throw. */
  getAll(): ParsedEnv<TSchema>;
  /**
   * The value of one key. A key that validated on the spot is answered like
   * `get` does, in a marked promise; an asynchronous one once every asynchronous
   * key of the space has answered, so that a rejection names every invalid
   * value at once.
   */
  getAsync<TKey extends keyof TSchema>(
    key: TKey,
  ): Promise<ParsedEnv<TSchema>[TKey]>;
  /**
   * Every value, the asynchronous ones awaited. Rejects naming every invalid
   * value at once. Marked as it settles, so `use()` unwraps it without
   * suspending from then on, and a rejection nobody awaits is not reported as
   * unhandled.
   */
  getAllAsync(): Promise<ParsedEnv<TSchema>>;
}

export function parseEnv<TSchema extends EnvSchema>(
  schema: TSchema,
  rawEnv: RawEnv,
  name: string,
): ParsedSpace<TSchema> {
  const outcomes: (Outcome | Promise<Outcome>)[] = [];
  const asyncKeys: string[] = [];

  for (const [key, type] of Object.entries(schema)) {
    const result = validate(type, rawEnv[key]);
    if (isThenable(result)) {
      asyncKeys.push(key);
      outcomes.push(awaitOutcome(key, result));
    } else {
      outcomes.push([key, result]);
    }
  }

  const sync = assemble<TSchema>(
    name,
    outcomes.filter((outcome): outcome is Outcome => !isThenable(outcome)),
  );

  function get<TKey extends keyof TSchema>(
    key: TKey,
  ): ParsedEnv<TSchema>[TKey] {
    if (sync.failure !== undefined) {
      throw sync.failure;
    }
    if (isAsync(key)) {
      throw new Error(asyncMessage(name, [String(key)], "get()", "getAsync()"));
    }
    return sync.env[key];
  }

  function getAll(): ParsedEnv<TSchema> {
    if (sync.failure !== undefined) {
      throw sync.failure;
    }
    if (asyncKeys.length > 0) {
      throw new Error(
        asyncMessage(name, asyncKeys, "getAll()", "getAllAsync()"),
      );
    }
    return sync.env;
  }

  function isAsync(key: PropertyKey): boolean {
    return asyncKeys.includes(String(key));
  }

  const env: Promise<ParsedEnv<TSchema>> =
    asyncKeys.length === 0
      ? sync.failure === undefined
        ? fulfilled(sync.env)
        : rejected(sync.failure)
      : tracked(
          Promise.all(outcomes).then((all) => {
            const { env: every, failure } = assemble<TSchema>(name, all);
            if (failure !== undefined) {
              throw failure;
            }
            return every;
          }),
        );

  function getAsync<TKey extends keyof TSchema>(
    key: TKey,
  ): Promise<ParsedEnv<TSchema>[TKey]> {
    if (isAsync(key)) {
      return chain(env, (every) => every[key]);
    }
    return sync.failure === undefined
      ? fulfilled(sync.env[key])
      : rejected(sync.failure);
  }

  function getAllAsync(): Promise<ParsedEnv<TSchema>> {
    return env;
  }

  return { get, getAll, getAsync, getAllAsync };
}

function validate(
  type: StandardSchemaV1,
  value: string | undefined,
): Result | PromiseLike<Result> {
  try {
    return type["~standard"].validate(value);
  } catch (error) {
    return thrown(error);
  }
}

function awaitOutcome(
  key: string,
  result: PromiseLike<Result>,
): Promise<Outcome> {
  return Promise.resolve(result).then(
    (settled): Outcome => [key, settled],
    (error: unknown): Outcome => [key, thrown(error)],
  );
}

/** A schema that threw instead of reporting issues, folded into one so the key can name itself. */
function thrown(error: unknown): Result {
  return { issues: [{ message: `the schema threw ${String(error)}` }] };
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

interface Assembled<TSchema extends EnvSchema> {
  /** The valid values, frozen, in the order of the outcomes. */
  readonly env: ParsedEnv<TSchema>;
  /** Names every invalid value among the outcomes; `undefined` when there is none. */
  readonly failure: Error | undefined;
}

function assemble<TSchema extends EnvSchema>(
  name: string,
  outcomes: readonly Outcome[],
): Assembled<TSchema> {
  const env: Record<string, unknown> = {};
  const invalid: InvalidValue[] = [];

  for (const [key, result] of outcomes) {
    if (result.issues) {
      invalid.push({ key, reason: describeIssues(result.issues) });
    } else {
      env[key] = result.value;
    }
  }

  return {
    env: Object.freeze(env) as ParsedEnv<TSchema>,
    failure:
      invalid.length === 0
        ? undefined
        : new Error(invalidMessage(name, invalid)),
  };
}

function asyncMessage(
  name: string,
  keys: readonly string[],
  call: string,
  asyncCall: string,
): string {
  const one = keys.length === 1;
  const named = keys.map((key) => `"${key}"`).join(", ");
  return (
    `${one ? "Key" : "Keys"} ${named} of the "${name}" env space ${one ? "validates" : "validate"} asynchronously ` +
    `— an async refinement or transform, or a transform that threw and was retried asynchronously — ` +
    `so ${call} cannot read ${one ? "it" : "them"}. Use ${asyncCall} instead.`
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
