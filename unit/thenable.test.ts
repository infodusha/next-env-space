import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  chain,
  fulfilled,
  isFulfilled,
  rejectOnThrow,
  rejected,
  tracked,
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

describe("tracked", () => {
  it("marks the promise pending, then fulfilled with its value", async () => {
    const { promise, resolve } = Promise.withResolvers<number>();

    assert.equal(
      tracked(promise),
      promise,
      "the same promise, marked in place",
    );
    assert.equal(settled(promise).status, "pending");
    assert.equal(isFulfilled(promise), false);

    resolve(42);
    assert.equal(await promise, 42);
    assert.ok(isFulfilled(promise));
    assert.equal(settled(promise).value, 42);
  });

  it("marks a rejection with its reason, handled so nobody has to await it", async () => {
    const reason = new Error("later");
    const { promise, reject } = Promise.withResolvers<never>();
    tracked(promise);

    reject(reason);
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    assert.equal(settled(promise).status, "rejected");
    assert.equal(settled(promise).reason, reason);
  });
});

describe("chain", () => {
  it("maps a marked fulfilled promise on the spot, into another one", () => {
    const promise = chain(fulfilled(2), (value) => value * 21);

    assert.equal(settled(promise).status, "fulfilled");
    assert.equal(settled(promise).value, 42);
  });

  it("passes a marked rejection on, still marked", async () => {
    const reason = new Error("no");
    const promise = chain(rejected(reason), () => "unreached");

    assert.equal(settled(promise).status, "rejected");
    assert.equal(settled(promise).reason, reason);
    await assert.rejects(promise, reason);
  });

  it("falls back to then() while the promise is pending", async () => {
    const { promise: pending, resolve } = Promise.withResolvers<number>();
    const promise = chain(pending, (value) => value * 2);

    assert.equal(settled(promise).status, undefined);

    resolve(21);
    assert.equal(await promise, 42);
  });
});
