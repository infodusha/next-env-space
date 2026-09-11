import assert from "node:assert/strict";
import { describe, it } from "node:test";

import * as z from "zod";

import { atBuildTime, inWorkUnit } from "./helpers/work-stores.ts";

// The package reads NODE_ENV when it loads, so it has to load after this line;
// every test file is its own process, so nothing else sees the change.
process.env.NODE_ENV = "production";

const { createEnvSpaceWith } = await import("../dist/space.js");
const { createSpace, runtimeWith, uniqueName } =
  await import("./helpers/space.ts");

describe("in production", () => {
  it("throws when a name is reused with other keys", () => {
    const createEnvSpace = createEnvSpaceWith(runtimeWith());
    const name = uniqueName("prod");

    createEnvSpace({ A: z.string() }, { name });
    assert.doesNotThrow(() => createEnvSpace({ A: z.string() }, { name }));
    assert.throws(() => createEnvSpace({ B: z.string() }, { name }), {
      message: new RegExp(
        `^Env space "${name}" is created twice with different keys\\.`,
        "u",
      ),
    });
  });

  it("leaves a prerender on the running server alone — ISR, on-demand statics", async () => {
    process.env.UNIT_PROD_NAME = "runtime-app";
    const space = createSpace({ UNIT_PROD_NAME: z.string() });

    await inWorkUnit(
      { type: "prerender-legacy", phase: "action" },
      async () => {
        assert.equal(space.get("UNIT_PROD_NAME"), "runtime-app");
        assert.equal(await space.getAsync("UNIT_PROD_NAME"), "runtime-app");
      },
    );
  });

  it("still refuses the same prerender when next build runs it", () => {
    process.env.UNIT_PROD_NAME = "build-app";
    const space = createSpace({ UNIT_PROD_NAME: z.string() });

    atBuildTime(() =>
      inWorkUnit({ type: "prerender-legacy", phase: "action" }, () => {
        assert.throws(() => space.get("UNIT_PROD_NAME"), {
          message: /while Next prerenders it at build time/u,
        });
      }),
    );
  });
});
