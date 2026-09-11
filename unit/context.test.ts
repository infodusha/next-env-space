import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { envContext, readContextRawEnv } from "../dist/context.js";

describe("envContext", () => {
  it("creates the context once and hands out the same one", () => {
    assert.equal(envContext(), envContext());
  });
});

describe("readContextRawEnv", () => {
  it("refuses to read while React is not rendering", () => {
    assert.throws(() => readContextRawEnv("public"), {
      message: /React is not rendering/u,
    });
  });
});
