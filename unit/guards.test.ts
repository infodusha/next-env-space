import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { connection } from "next/dist/server/request/connection.js";

import { createReadySpace, runtimeWith } from "./helpers/space.ts";
import { atBuildTime, inWorkUnit } from "./helpers/work-stores.ts";

const cacheStores = ["cache", "private-cache", "unstable-cache"] as const;

describe("a read where next build would capture the value", () => {
  it("is refused inside generateStaticParams, on any server", async () => {
    const space = createReadySpace();

    await inWorkUnit({ type: "generate-static-params" }, async () => {
      assert.throws(() => space.get("UNIT_NAME"), {
        message:
          /^get\('UNIT_NAME'\) of the "unit-\d+" env space is called inside generateStaticParams/u,
      });
      await assert.rejects(space.getAsync("UNIT_NAME"), {
        message:
          /^getAsync\('UNIT_NAME'\) of the "unit-\d+" env space is called inside generateStaticParams/u,
      });
    });
  });

  it("is refused inside a cached function while the build fills the cache", async () => {
    const space = createReadySpace();

    await Promise.all(
      cacheStores.map((type) =>
        atBuildTime(() =>
          inWorkUnit({ type }, async () => {
            assert.throws(() => space.getAll(), {
              message:
                /^getAll\(\) of the "unit-\d+" env space is called inside a cached function/u,
            });
            await assert.rejects(space.getAllAsync(), {
              message:
                /^getAllAsync\(\) of the "unit-\d+" env space is called inside a cached function/u,
            });
          }),
        ),
      ),
    );
  });

  it("is refused for get() in a Route Handler the build prerenders, while getAsync() opts the route out", async () => {
    const space = createReadySpace(
      runtimeWith({ optOutOfPrerender: connection }),
    );

    await atBuildTime(() =>
      inWorkUnit({ type: "prerender-legacy", phase: "action" }, async () => {
        assert.throws(() => space.get("UNIT_NAME"), {
          message:
            /is called in a Route Handler while Next prerenders it at build time.*Use getAsync\(\), which opts the route out of prerendering.*\/robots\.txt.*module scope/u,
        });
        // Next's own bailout: connection() interrupts the prerender and the
        // build marks the route dynamic, so the guard has nothing to refuse.
        await assert.rejects(space.getAsync("UNIT_NAME"), {
          message:
            /couldn't be rendered statically because it used `connection`/u,
        });
      }),
    );
  });

  it("is refused for both reads where the route's dynamic config keeps connection() from opting out", async () => {
    const space = createReadySpace(
      runtimeWith({ optOutOfPrerender: connection }),
    );

    await Promise.all(
      [{ forceStatic: true }, { dynamicShouldError: true }].map((store) =>
        atBuildTime(
          () =>
            inWorkUnit(
              { type: "prerender-legacy", phase: "action" },
              async () => {
                assert.throws(() => space.get("UNIT_NAME"), {
                  message:
                    /is called in a Route Handler while Next prerenders it at build time.*dynamic = "force-static" or "error" keeps connection\(\) from opting the route out/u,
                });
                await assert.rejects(space.getAsync("UNIT_NAME"), {
                  message:
                    /^getAsync\('UNIT_NAME'\) of the "unit-\d+" env space is called in a Route Handler while Next prerenders it at build time.*drop that config/u,
                });
              },
            ),
          store,
        ),
      ),
    );
  });

  it("is refused where a development prerender stands in for the build", () => {
    const space = createReadySpace();

    inWorkUnit({ type: "prerender", phase: "action" }, () => {
      assert.throws(() => space.get("UNIT_NAME"), {
        message: /while Next prerenders it at build time/u,
      });
    });
  });
});

describe("a read the running server does", () => {
  it("goes through inside a cached function the server fills", () => {
    const space = createReadySpace();

    for (const type of cacheStores) {
      inWorkUnit({ type }, () => {
        assert.equal(space.get("UNIT_NAME"), "app");
      });
    }
  });

  it("goes through in a Server Action and in a Route Handler of a request", async () => {
    const space = createReadySpace();

    await inWorkUnit({ type: "request", phase: "action" }, async () => {
      assert.equal(space.get("UNIT_NAME"), "app");
      assert.equal(await space.getAsync("UNIT_NAME"), "app");
    });
  });

  it("goes through with no work unit at all — module scope, instrumentation", async () => {
    const space = createReadySpace();

    assert.equal(space.get("UNIT_NAME"), "app");
    assert.equal(await space.getAsync("UNIT_NAME"), "app");
  });
});
