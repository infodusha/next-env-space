import assert from "node:assert/strict";
import { describe, it } from "node:test";

import * as z from "zod";

import { isErrorDocumentReadError } from "../dist/error-document.js";
import { envSpacesKey, type RawEnv } from "../dist/global.js";
import { isFulfilled } from "../dist/thenable.js";
import { withGlobal } from "./helpers/globals.ts";
import { createSpace, runtimeWith, settled } from "./helpers/space.ts";

interface FakeWindow {
  [envSpacesKey]?: Record<string, RawEnv | undefined>;
}

// Every test file is its own process, so this file is the browser: the
// package tells the two apart by `typeof window` at every read.
const fakeWindow: FakeWindow = {};
Object.defineProperty(globalThis, "window", {
  value: fakeWindow,
  configurable: true,
  writable: true,
});

const shape = { APP_NAME: z.string(), PORT: z.coerce.number() };

function publish(name: string, rawEnv: RawEnv): void {
  fakeWindow[envSpacesKey] = { ...fakeWindow[envSpacesKey], [name]: rawEnv };
}

describe("a read in the browser", () => {
  it("answers from what the inline script published", async () => {
    const space = createSpace(shape);
    publish(space.name, { APP_NAME: "app", PORT: "3000" });

    assert.equal(space.get("PORT"), 3000);
    assert.equal(await space.getAsync("APP_NAME"), "app");
  });

  it("names both publishers when the space did not arrive", () => {
    const space = createSpace(shape);

    assert.throws(
      () => space.get("APP_NAME"),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(
          error.message,
          new RegExp(
            `^Env space "${space.name}" is missing on the client\\.`,
            "u",
          ),
        );
        assert.match(error.message, /<ClientEnvScript space=\{\.\.\.\} \/>/u);
        assert.match(error.message, /<ClientEnvProvider space=\{\.\.\.\}>/u);
        return true;
      },
    );
  });

  it("is not stopped by the guards, which only watch the build", () => {
    const space = createSpace(shape);
    publish(space.name, { APP_NAME: "app", PORT: "1" });

    // The stores are never populated in a browser; the guard returns before
    // it would even look at them.
    assert.equal(space.get("APP_NAME"), "app");
  });
});

/** A runtime whose context carries exactly one space, the way one `<ClientEnvProvider>` does. */
function providerRuntime(name: string, rawEnv: RawEnv) {
  const spaces: Record<string, RawEnv | undefined> = { [name]: rawEnv };
  return runtimeWith({ readContextRawEnv: (asked) => spaces[asked] });
}

describe("a space that only the provider carries", () => {
  it("is read by getAsync() through the context, without suspending", () => {
    const name = "provided-only";
    const space = createSpace(shape, {
      name,
      runtime: providerRuntime(name, { APP_NAME: "provided", PORT: "8080" }),
    });

    const promise = space.getAsync("PORT");

    assert.ok(isFulfilled(promise));
    assert.equal(settled(promise).value, 8080);
  });

  it("is never read by get(), which does not look at the context", () => {
    const name = "provided-sync";
    const space = createSpace(shape, {
      name,
      runtime: providerRuntime(name, { APP_NAME: "provided", PORT: "8080" }),
    });

    assert.throws(() => space.get("APP_NAME"), {
      message: /is missing on the client\./u,
    });
  });

  it("tells getAsync() apart from a render when the context cannot be read", async () => {
    const space = createSpace(shape, {
      runtime: runtimeWith({
        readContextRawEnv: () => {
          throw new Error("React is not rendering");
        },
      }),
    });

    await assert.rejects(space.getAsync("APP_NAME"), {
      message:
        /^getAsync\(\) of the "unit-\d+" env space was called outside of a render/u,
    });
  });

  it("is missing, not outside a render, when the context has no such space", async () => {
    const space = createSpace(shape, {
      runtime: providerRuntime("some-other-space", {}),
    });

    await assert.rejects(space.getAsync("APP_NAME"), {
      message: /is missing on the client\./u,
    });
  });
});

describe("on the error document of a failed server render", () => {
  const errorDocument = { documentElement: { id: "__next_error__" } };

  it("get() and getAll() answer undefined and report the space once, after boot", (t) =>
    withGlobal("document", errorDocument, () => {
      const scheduled: (() => void)[] = [];
      t.mock.method(globalThis, "setTimeout", (callback: () => void) => {
        scheduled.push(callback);
        return 0;
      });
      const space = createSpace(shape);

      assert.equal(space.get("APP_NAME"), undefined);
      const all = space.getAll();
      assert.deepEqual(all, { APP_NAME: undefined, PORT: undefined });
      assert.ok(Object.isFrozen(all));

      assert.equal(scheduled.length, 1, "reported once per space");
      assert.throws(scheduled[0] ?? (() => {}), (error: unknown) => {
        assert.ok(isErrorDocumentReadError(error));
        assert.match(
          error.message,
          /is missing on the client: the server render of this page failed/u,
        );
        return true;
      });
    }));

  it("getAsync() rejects with that same error", () =>
    withGlobal("document", errorDocument, async () => {
      const space = createSpace(shape);

      await assert.rejects(space.getAsync("APP_NAME"), (error: unknown) => {
        assert.ok(isErrorDocumentReadError(error));
        return true;
      });
    }));

  it("is told apart from any other document", () =>
    withGlobal("document", { documentElement: { id: "" } }, () => {
      const space = createSpace(shape);

      assert.throws(
        () => space.get("APP_NAME"),
        (error: unknown) => {
          assert.ok(!isErrorDocumentReadError(error));
          return true;
        },
      );
    }));
});
