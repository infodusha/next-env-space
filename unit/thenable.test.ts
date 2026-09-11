import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  fulfilled,
  isFulfilled,
  rejectOnThrow,
  rejected,
} from "../dist/thenable.js";
import { settled } from "./helpers/space.ts";

describe("fulfilled", () => {
  it("carries the value where use() reads it, and resolves with it", async () => {
    const promise = fulfilled(42);

    assert.equal(settled(promise).status, "fulfilled");
    assert.equal(settled(promise).value, 42);
    assert.equal(await promise, 42);
  });

  it("resolves with undefined when given nothing", async () => {
    const promise = fulfilled();

    assert.equal(settled(promise).status, "fulfilled");
    assert.equal(await promise, undefined);
  });
});

describe("rejected", () => {
  it("carries the reason where use() reads it, and rejects with it", async () => {
    const reason = new Error("boom");
    const promise = rejected(reason);

    assert.equal(settled(promise).status, "rejected");
    assert.equal(settled(promise).reason, reason);
    await assert.rejects(promise, reason);
  });

  it("is not reported as unhandled when nobody awaits it", async () => {
    // use() throws the reason without ever calling .then, so the promise has
    // to carry its own handler — otherwise this test's process would die here.
    rejected(new Error("never awaited"));

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  });
});

describe("isFulfilled", () => {
  it("recognises only a marked fulfilled promise", () => {
    assert.equal(isFulfilled(fulfilled(1)), true);
    assert.equal(isFulfilled(rejected(new Error("no"))), false);
    assert.equal(isFulfilled(Promise.resolve(1)), false);
  });
});

describe("rejectOnThrow", () => {
  it("returns what the read returns, untouched", () => {
    const promise = fulfilled("value");

    assert.equal(
      rejectOnThrow(() => promise),
      promise,
    );
  });

  it("turns a synchronous throw into a marked rejection", async () => {
    const reason = new Error("thrown");
    const promise = rejectOnThrow<never>(() => {
      throw reason;
    });

    assert.equal(settled(promise).status, "rejected");
    assert.equal(settled(promise).reason, reason);
    await assert.rejects(promise, reason);
  });
});
