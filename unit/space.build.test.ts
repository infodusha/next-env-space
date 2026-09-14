import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { isFulfilled } from "../dist/thenable.js";
import { createSpace, settled, unitShape } from "./helpers/space.ts";
import { atBuildTime, inWorkUnit } from "./helpers/work-stores.ts";

// The phase is read on every call, so this file enters and leaves `next build`
// per test; every other file runs with it unset, the way a server does.
beforeEach(() => {
  process.env.NEXT_PHASE = "phase-production-build";
});

afterEach(() => {
  delete process.env.NEXT_PHASE;
});

describe("a read while next build runs", () => {
  it("answers undefined without parsing, whatever process.env holds", async () => {
    delete process.env.UNIT_NAME;
    process.env.UNIT_COUNT = "not-a-number";
    const space = createSpace(unitShape);

    assert.equal(space.get("UNIT_NAME"), undefined);
    assert.equal(space.get("UNIT_COUNT"), undefined);
    const all = space.getAll();
    assert.deepEqual(all, {
      UNIT_NAME: undefined,
      UNIT_COUNT: undefined,
      UNIT_OPTIONAL: undefined,
    });
    assert.ok(Object.isFrozen(all));

    const promise = space.getAsync("UNIT_COUNT");
    assert.ok(isFulfilled(promise), "a top-level await must not suspend on it");
    assert.equal(settled(promise).value, undefined);
    assert.deepEqual(await space.getAllAsync(), all);
  });

  it("caches nothing, so the running server parses the real values", () => {
    process.env.UNIT_NAME = "app";
    process.env.UNIT_COUNT = "42";
    delete process.env.UNIT_OPTIONAL;
    const space = createSpace(unitShape);

    assert.equal(space.get("UNIT_COUNT"), undefined);

    delete process.env.NEXT_PHASE;
    assert.equal(space.get("UNIT_COUNT"), 42);
  });

  it("still rejects a key the shape does not declare", async () => {
    const space = createSpace(unitShape);

    assert.throws(() => space.get("NOPE" as never), {
      message: /^Key "NOPE" is not in/u,
    });
    await assert.rejects(space.getAsync("NOPE" as never), {
      message: /^Key "NOPE" is not in/u,
    });
  });

  it("still lets the guards refuse a read the build would capture", async () => {
    const space = createSpace(unitShape);

    await atBuildTime(() =>
      inWorkUnit({ type: "prerender-legacy", phase: "action" }, async () => {
        assert.throws(() => space.get("UNIT_NAME"), {
          message: /while Next prerenders it at build time/u,
        });
        await assert.rejects(space.getAsync("UNIT_NAME"), {
          message: /while Next prerenders it at build time/u,
        });
      }),
    );

    inWorkUnit({ type: "generate-static-params" }, () => {
      assert.throws(() => space.getAll(), {
        message: /inside generateStaticParams/u,
      });
    });
  });
});
