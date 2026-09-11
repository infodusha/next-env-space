import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type } from "arktype";
import * as v from "valibot";
import * as z from "zod";

import { parseEnv } from "../dist/parse.js";

describe("parseEnv", () => {
  it("parses every key with its own schema and freezes the result", () => {
    const env = parseEnv(
      {
        NAME: z.string(),
        COUNT: z.coerce.number(),
        FLAG: z.stringbool(),
        OPTIONAL: z.string().optional(),
      },
      { NAME: "app", COUNT: "42", FLAG: "true" },
      "public",
    );

    assert.deepEqual(env, {
      NAME: "app",
      COUNT: 42,
      FLAG: true,
      OPTIONAL: undefined,
    });
    assert.ok(Object.isFrozen(env));
  });

  it("takes schemas of different libraries in one shape", () => {
    const env = parseEnv(
      {
        ZOD: z.string(),
        VALIBOT: v.pipe(v.string(), v.transform(Number)),
        ARKTYPE: type("string.numeric.parse"),
      },
      { ZOD: "z", VALIBOT: "1", ARKTYPE: "2" },
      "mixed",
    );

    assert.deepEqual(env, { ZOD: "z", VALIBOT: 1, ARKTYPE: 2 });
  });

  it("names the one variable that is invalid, and its space", () => {
    assert.throws(
      () => parseEnv({ URL: z.url() }, { URL: "not-a-url" }, "public"),
      {
        message:
          /^Environment variable URL of the "public" env space is not valid: /u,
      },
    );
  });

  it("reports a missing required variable the same way", () => {
    assert.throws(() => parseEnv({ URL: z.url() }, {}, "public"), {
      message: /^Environment variable URL of the "public" env space/u,
    });
  });

  it("reports every invalid variable at once, one per line", () => {
    assert.throws(
      () =>
        parseEnv(
          { URL: z.url(), COUNT: z.coerce.number(), OK: z.string() },
          { URL: "nope", COUNT: "many", OK: "fine" },
          "public",
        ),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        const [head, ...lines] = error.message.split("\n");
        assert.equal(
          head,
          '2 environment variables of the "public" env space are not valid:',
        );
        assert.equal(lines.length, 2);
        assert.match(lines[0] ?? "", /^ {2}URL: /u);
        assert.match(lines[1] ?? "", /^ {2}COUNT: /u);
        return true;
      },
    );
  });

  it("appends the path of an issue inside a parsed value", () => {
    const json = z
      .string()
      .transform((raw) => JSON.parse(raw) as unknown)
      .pipe(z.object({ endpoint: z.url() }));

    assert.throws(
      () => parseEnv({ CONFIG: json }, { CONFIG: '{"endpoint":"nope"}' }, "p"),
      { message: /\(at endpoint\)$/u },
    );
  });

  it("refuses a schema that can only validate asynchronously", () => {
    const asyncSchema = z.string().refine(() => Promise.resolve(true));

    assert.throws(
      () => parseEnv({ KEY: asyncSchema }, { KEY: "value" }, "public"),
      {
        message:
          /^Key "KEY" of the "public" env space validates asynchronously\./u,
      },
    );
  });
});
