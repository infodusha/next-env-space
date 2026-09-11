import assert from "node:assert/strict";
import { describe, it } from "node:test";

import * as z from "zod";

import { createEnvSpaceWith, readShippedEnv } from "../dist/space.js";
import { isFulfilled } from "../dist/thenable.js";
import {
  createReadySpace,
  createSpace,
  runtimeWith,
  settled,
  uniqueName,
  unitShape,
} from "./helpers/space.ts";

describe("createEnvSpace", () => {
  it("exposes the name, the keys in order and the schema", () => {
    const space = createSpace(unitShape, { name: "described" });

    assert.equal(space.name, "described");
    assert.deepEqual(space.keys, ["UNIT_NAME", "UNIT_COUNT", "UNIT_OPTIONAL"]);
    assert.ok(Object.isFrozen(space.keys));
    assert.equal(space.schema, unitShape);
  });

  it('names a space "default" when no name is given', () => {
    const createEnvSpace = createEnvSpaceWith(runtimeWith());

    assert.equal(createEnvSpace({}).name, "default");
  });

  it("warns once, outside production, when a name is reused with other keys", (t) => {
    const warn = t.mock.method(console, "warn", () => {});
    const createEnvSpace = createEnvSpaceWith(runtimeWith());
    const name = uniqueName("twice");

    createEnvSpace({ A: z.string() }, { name });
    createEnvSpace({ A: z.string() }, { name });
    assert.equal(warn.mock.callCount(), 0, "the same keys are a hot reload");

    createEnvSpace({ B: z.string() }, { name });
    createEnvSpace({ C: z.string() }, { name });
    assert.equal(warn.mock.callCount(), 1);
    assert.match(
      String(warn.mock.calls[0]?.arguments[0]),
      new RegExp(
        `^Env space "${name}" is created twice with different keys\\.`,
        "u",
      ),
    );
  });
});

describe("a read on the server", () => {
  it("parses process.env on first use and keeps that result", () => {
    const space = createReadySpace();

    assert.equal(space.get("UNIT_COUNT"), 42);
    assert.equal(space.get("UNIT_OPTIONAL"), undefined);

    process.env.UNIT_COUNT = "7";
    assert.equal(space.get("UNIT_COUNT"), 42, "the space is parsed once");

    const all = space.getAll();
    assert.deepEqual(all, {
      UNIT_NAME: "app",
      UNIT_COUNT: 42,
      UNIT_OPTIONAL: undefined,
    });
    assert.ok(Object.isFrozen(all));
  });

  it("fails on the first read whichever key is asked for, naming the bad one", () => {
    process.env.UNIT_NAME = "app";
    process.env.UNIT_COUNT = "not-a-number";
    const space = createSpace(unitShape);

    assert.throws(() => space.get("UNIT_NAME"), {
      message:
        /^Environment variable UNIT_COUNT of the "unit-\d+" env space is not valid/u,
    });
  });

  it("rejects a key the shape does not declare, listing the known ones", () => {
    const space = createReadySpace();

    assert.throws(() => space.get("NOPE" as never), {
      message:
        /^Key "NOPE" is not in the "unit-\d+" env space\. It has UNIT_NAME, UNIT_COUNT, UNIT_OPTIONAL\.$/u,
    });
    assert.throws(() => createSpace({}).get("NOPE" as never), {
      message: /The space has no keys\.$/u,
    });
  });
});

describe("getAsync", () => {
  it("answers a marked fulfilled promise when the opt-out already is one", async () => {
    const space = createReadySpace();

    const promise = space.getAsync("UNIT_COUNT");

    assert.ok(isFulfilled(promise), "use() must unwrap it without suspending");
    assert.equal(settled(promise).value, 42);
    assert.equal(await promise, 42);
    assert.deepEqual(await space.getAllAsync(), space.getAll());
  });

  it("waits for a pending opt-out before reading", async () => {
    const { promise: optedOut, resolve: release } =
      Promise.withResolvers<void>();
    const space = createReadySpace(
      runtimeWith({ optOutOfPrerender: () => optedOut }),
    );

    const promise = space.getAsync("UNIT_NAME");
    assert.equal(isFulfilled(promise), false);

    release();
    assert.equal(await promise, "app");
  });

  it("treats a missing request scope as nothing to opt out of", async () => {
    const space = createReadySpace(
      runtimeWith({
        optOutOfPrerender: () => {
          throw Object.assign(new Error("outside a request"), {
            __NEXT_ERROR_CODE: "E251",
          });
        },
      }),
    );

    assert.equal(await space.getAsync("UNIT_NAME"), "app");
  });

  it("rejects, rather than throws, when the opt-out fails for another reason", async () => {
    const reason = new Error("opt-out failed");
    const space = createReadySpace(
      runtimeWith({
        optOutOfPrerender: () => {
          throw reason;
        },
      }),
    );

    let promise: Promise<unknown> | undefined;
    assert.doesNotThrow(() => {
      promise = space.getAsync("UNIT_NAME");
    });
    assert.ok(promise !== undefined);
    assert.equal(settled(promise).status, "rejected");
    await assert.rejects(promise, reason);
  });

  it("rejects, rather than throws, on a key the shape does not declare", async () => {
    const space = createReadySpace();

    let promise: Promise<unknown> | undefined;
    assert.doesNotThrow(() => {
      promise = space.getAsync("NOPE" as never);
    });
    assert.ok(promise !== undefined);
    await assert.rejects(promise, { message: /^Key "NOPE" is not in/u });
  });
});

describe("readShippedEnv", () => {
  it("hands out the raw values of the keys, with nothing to report", () => {
    const space = createReadySpace();

    assert.deepEqual(readShippedEnv(space), {
      rawEnv: { UNIT_NAME: "app", UNIT_COUNT: "42", UNIT_OPTIONAL: undefined },
      failure: undefined,
    });
  });

  it("hands out the raw values alongside the failure when they do not parse", () => {
    process.env.UNIT_NAME = "app";
    process.env.UNIT_COUNT = "not-a-number";
    const space = createSpace(unitShape);

    const { rawEnv, failure } = readShippedEnv(space);

    assert.equal(rawEnv.UNIT_COUNT, "not-a-number");
    assert.ok(failure instanceof Error);
    assert.match(
      failure.message,
      /^Environment variable UNIT_COUNT of the "unit-\d+" env space is not valid/u,
    );
  });

  it("parses the space on the way, so the reads that follow are served from the cache", () => {
    const space = createReadySpace();

    assert.equal(readShippedEnv(space).failure, undefined);

    process.env.UNIT_COUNT = "7";
    assert.equal(space.get("UNIT_COUNT"), 42);
  });

  it("refuses a space this package instance did not create", () => {
    const space = createReadySpace();
    const lookalike = { ...space };

    assert.throws(() => readShippedEnv(lookalike as typeof space), {
      message:
        /^Env space "unit-\d+" was not created by createEnvSpace\(\) of this package instance\.$/u,
    });
  });
});
