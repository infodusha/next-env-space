import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { StandardSchemaV1 } from "@standard-schema/spec";
import { type } from "arktype";
import * as v from "valibot";
import * as z from "zod";

import { parseEnv } from "../dist/parse.js";
import { isFulfilled } from "../dist/thenable.js";
import { settled } from "./helpers/space.ts";

describe("parseEnv", () => {
  it("parses every key with its own schema and freezes the result", async () => {
    const parsed = parseEnv(
      {
        NAME: z.string(),
        COUNT: z.coerce.number(),
        FLAG: z.stringbool(),
        OPTIONAL: z.string().optional(),
      },
      { NAME: "app", COUNT: "42", FLAG: "true" },
      "public",
    );

    const env = parsed.getAll();
    assert.deepEqual(env, {
      NAME: "app",
      COUNT: 42,
      FLAG: true,
      OPTIONAL: undefined,
    });
    assert.ok(Object.isFrozen(env));
    assert.equal(parsed.get("COUNT"), 42);
    assert.equal(await parsed.getAsync("COUNT"), 42);
    assert.equal(await parsed.getAllAsync(), env);
  });

  it("answers the asynchronous reads on the spot when every schema did", () => {
    const parsed = parseEnv({ NAME: z.string() }, { NAME: "app" }, "public");

    const one = parsed.getAsync("NAME");
    const all = parsed.getAllAsync();

    assert.ok(isFulfilled(one), "use() must unwrap it without suspending");
    assert.equal(settled(one).value, "app");
    assert.ok(isFulfilled(all));
    assert.equal(settled(all).value, parsed.getAll());
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
    ).getAll();

    assert.deepEqual(env, { ZOD: "z", VALIBOT: 1, ARKTYPE: 2 });
  });

  it("names the one variable that is invalid, and its space, in every read", async () => {
    const parsed = parseEnv({ URL: z.url() }, { URL: "not-a-url" }, "public");
    const message =
      /^Environment variable URL of the "public" env space is not valid: /u;

    assert.throws(() => parsed.getAll(), { message });
    assert.throws(() => parsed.get("URL"), { message });
    assert.equal(settled(parsed.getAsync("URL")).status, "rejected");
    await assert.rejects(parsed.getAsync("URL"), { message });
    await assert.rejects(parsed.getAllAsync(), { message });
  });

  it("reports a missing required variable the same way", () => {
    assert.throws(() => parseEnv({ URL: z.url() }, {}, "public").getAll(), {
      message: /^Environment variable URL of the "public" env space/u,
    });
  });

  it("fails the read of a valid key while another one is invalid", () => {
    const parsed = parseEnv(
      { URL: z.url(), OK: z.string() },
      { URL: "nope", OK: "fine" },
      "public",
    );

    assert.throws(() => parsed.get("OK"), {
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
        ).getAll(),
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
      () =>
        parseEnv(
          { CONFIG: json },
          { CONFIG: '{"endpoint":"nope"}' },
          "p",
        ).getAll(),
      { message: /\(at endpoint\)$/u },
    );
  });

  it("folds a schema that throws into an invalid value, so the key names itself", () => {
    const throwing: StandardSchemaV1<string> = {
      "~standard": {
        version: 1,
        vendor: "unit",
        validate() {
          throw new Error("boom");
        },
      },
    };

    assert.throws(
      () => parseEnv({ KEY: throwing }, { KEY: "value" }, "public").getAll(),
      {
        message:
          /^Environment variable KEY of the "public" env space is not valid: the schema threw Error: boom$/u,
      },
    );
  });
});

describe("a key whose schema validates asynchronously", () => {
  const shape = {
    NAME: z.string(),
    CHECKED: z
      .string()
      .refine((value) => Promise.resolve(value !== "rejected"), {
        message: "was rejected",
      }),
    DOUBLED: z.coerce.number().transform((count) => Promise.resolve(count * 2)),
  };
  const rawEnv = { NAME: "app", CHECKED: "fine", DOUBLED: "21" };

  it("is refused by the synchronous reads, which name it and the read to use", () => {
    const parsed = parseEnv(shape, rawEnv, "public");

    assert.equal(parsed.get("NAME"), "app", "the other keys still answer");
    assert.throws(() => parsed.get("CHECKED"), {
      message:
        /^Key "CHECKED" of the "public" env space validates asynchronously — .+ — so get\(\) cannot read it\. Use getAsync\(\) instead\.$/u,
    });
    assert.throws(() => parsed.getAll(), {
      message:
        /^Keys "CHECKED", "DOUBLED" of the "public" env space validate asynchronously — .+ — so getAll\(\) cannot read them\. Use getAllAsync\(\) instead\.$/u,
    });
  });

  it("is awaited by getAsync(), while a key that answered on the spot is not held back", async () => {
    const parsed = parseEnv(shape, rawEnv, "public");

    const name = parsed.getAsync("NAME");
    assert.ok(isFulfilled(name), "nothing to wait for on this one");
    assert.equal(settled(name).value, "app");

    const doubled = parsed.getAsync("DOUBLED");
    assert.equal(
      isFulfilled(doubled),
      false,
      "use() has to suspend on this one",
    );
    assert.equal(await doubled, 42);
  });

  it("is awaited by getAllAsync(), which then carries every key in schema order", async () => {
    const parsed = parseEnv(shape, rawEnv, "public");
    const all = parsed.getAllAsync();

    assert.equal(settled(all).status, "pending");

    const env = await all;
    assert.deepEqual(env, { NAME: "app", CHECKED: "fine", DOUBLED: 42 });
    assert.deepEqual(Object.keys(env), ["NAME", "CHECKED", "DOUBLED"]);
    assert.ok(Object.isFrozen(env));
    assert.ok(
      isFulfilled(all),
      "marked once settled, for use() on the next render",
    );
    assert.equal(settled(all).value, env);
    assert.ok(isFulfilled(parsed.getAsync("DOUBLED")), "and so is the key");
  });

  it("rejects with every invalid value at once, the synchronous ones included", async () => {
    const parsed = parseEnv(
      shape,
      { CHECKED: "rejected", DOUBLED: "21" },
      "public",
    );

    assert.throws(() => parsed.get("NAME"), {
      message:
        /^Environment variable NAME of the "public" env space is not valid: /u,
    });
    await assert.rejects(parsed.getAsync("CHECKED"), (error: unknown) => {
      assert.ok(error instanceof Error);
      const [head, ...lines] = error.message.split("\n");
      assert.equal(
        head,
        '2 environment variables of the "public" env space are not valid:',
      );
      assert.match(lines[0] ?? "", /^ {2}NAME: /u);
      assert.equal(lines[1], "  CHECKED: was rejected");
      return true;
    });
    assert.equal(settled(parsed.getAllAsync()).status, "rejected");
  });

  it("folds a schema that rejects instead of reporting issues into an invalid value", async () => {
    // zod retries a transform that threw asynchronously, and the retry rejects
    // with what it threw: a key that never asked for a promise gets one.
    const json = z.preprocess(
      (raw) => JSON.parse(raw as string) as unknown,
      z.record(z.string(), z.string()),
    );
    const parsed = parseEnv({ CONFIG: json }, {}, "public");

    assert.throws(() => parsed.get("CONFIG"), {
      message: /validates asynchronously — .*a transform that threw/u,
    });
    await assert.rejects(parsed.getAsync("CONFIG"), {
      message:
        /^Environment variable CONFIG of the "public" env space is not valid: the schema threw SyntaxError: /u,
    });
  });

  it("is not reported as unhandled when nobody awaits the failure", async () => {
    const parsed = parseEnv(
      { CHECKED: shape.CHECKED },
      { CHECKED: "rejected" },
      "public",
    );

    assert.equal(settled(parsed.getAllAsync()).status, "pending");
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    assert.equal(settled(parsed.getAllAsync()).status, "rejected");
  });
});
