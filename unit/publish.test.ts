import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { envSpacesKey, type RawEnv } from "../dist/global.js";
import { createEnvScript, publishToWindow } from "../dist/publish.js";
import { withGlobal } from "./helpers/globals.ts";

const payload =
  /^window\["__ENV_SPACES__"\]=Object\.assign\(window\["__ENV_SPACES__"\]\|\|\{\},(?<space>.*)\);$/su;

function spaceOf(script: string): string {
  const space = payload.exec(script)?.groups?.space;
  assert.ok(space !== undefined, `not the env script: ${script}`);
  return space;
}

describe("createEnvScript", () => {
  it("merges the space into the window key, keeping the other spaces", () => {
    assert.equal(
      createEnvScript("public", { APP_NAME: "app", PORT: "3000" }),
      'window["__ENV_SPACES__"]=Object.assign(window["__ENV_SPACES__"]||{},{"public":{"APP_NAME":"app","PORT":"3000"}});',
    );
  });

  it("leaves an unset key out, so it reads as undefined like on the server", () => {
    assert.equal(
      spaceOf(createEnvScript("public", { SET: "1", UNSET: undefined })),
      '{"public":{"SET":"1"}}',
    );
  });

  it("escapes every < so a value cannot close the script tag", () => {
    const rawEnv = {
      UNSAFE: "</script><script>globalThis.__pwned = true;</script><!--",
    };
    const space = spaceOf(createEnvScript("public", rawEnv));

    assert.doesNotMatch(space, /<\/?script|<!--/iu);
    assert.doesNotMatch(space, /</u);
    // The escape is plain JSON, so the browser reads the value back unchanged.
    assert.deepEqual(JSON.parse(space), { public: rawEnv });
  });
});

interface FakeWindow {
  [envSpacesKey]?: Record<string, RawEnv | undefined>;
}

describe("publishToWindow", () => {
  it("does nothing where there is no window", () => {
    assert.doesNotThrow(() => publishToWindow("public", { A: "1" }));
  });

  it("creates the window key on first publish, and merges the next space in", () =>
    withGlobal("window", {} satisfies FakeWindow, () => {
      const fake = window as FakeWindow;

      publishToWindow("public", { A: "1" });
      publishToWindow("feature", { B: "2" });

      assert.deepEqual(fake[envSpacesKey], {
        public: { A: "1" },
        feature: { B: "2" },
      });
    }));

  it("leaves a space that is already published alone", () =>
    withGlobal(
      "window",
      { [envSpacesKey]: { public: { A: "from-script" } } } satisfies FakeWindow,
      () => {
        const fake = window as FakeWindow;

        publishToWindow("public", { A: "from-render" });

        assert.deepEqual(fake[envSpacesKey]?.public, { A: "from-script" });
      },
    ));
});
