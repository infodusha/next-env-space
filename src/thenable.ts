/** The fields React's `use()` reads off a thenable to unwrap it without suspending. */
interface Marks<TValue> {
  status?: "pending" | "fulfilled" | "rejected";
  value?: TValue;
  reason?: unknown;
}

type MarkedThenable<TValue> = Promise<TValue> & Marks<TValue>;

export function fulfilled(): Promise<void>;
export function fulfilled<TValue>(value: TValue): Promise<TValue>;
export function fulfilled(value?: unknown): Promise<unknown> {
  const promise = Promise.resolve(value);
  mark(promise, { status: "fulfilled", value });
  return promise;
}

export function rejected(reason: unknown): Promise<never> {
  const promise = Promise.reject<never>(reason);
  mark(promise, { status: "rejected", reason });
  promise.catch(() => {});
  return promise;
}

/**
 * Writes the marks onto the promise. Hands back the marks rather than the
 * promise, so that a then() handler can end on it: one that returned the
 * promise would pass a rejection on to the promise then() creates, which
 * nobody holds.
 */
function mark<TValue>(
  promise: Promise<TValue>,
  marks: Marks<TValue>,
): Marks<TValue> {
  Object.assign(promise, marks);
  return marks;
}

export function isFulfilled(promise: Promise<unknown>): boolean {
  return (promise as MarkedThenable<unknown>).status === "fulfilled";
}

/**
 * Marks `promise` the way `fulfilled()` and `rejected()` mark theirs, once it
 * settles: from then on `use()` unwraps it without suspending and `chain()`
 * answers on the spot. A rejection nobody awaits is not reported as unhandled.
 */
export function tracked<TValue>(promise: Promise<TValue>): Promise<TValue> {
  mark(promise, { status: "pending" });
  promise.then(
    (value) => mark(promise, { status: "fulfilled", value }),
    (reason: unknown) => mark(promise, { status: "rejected", reason }),
  );
  return promise;
}

/**
 * `promise.then(map)`, except that a marked settled promise is answered on the
 * spot with a marked one — mapped when fulfilled, passed on when rejected — so
 * `use()` never suspends on a value that is already known.
 */
export function chain<TValue, TResult>(
  promise: Promise<TValue>,
  map: (value: TValue) => TResult,
): Promise<TResult> {
  const marked = promise as MarkedThenable<TValue>;
  if (marked.status === "fulfilled") {
    return fulfilled(map(marked.value as TValue));
  }
  if (marked.status === "rejected") {
    return rejected(marked.reason);
  }
  return promise.then(map);
}

export function rejectOnThrow<TValue>(
  read: () => Promise<TValue>,
): Promise<TValue> {
  try {
    return read();
  } catch (error) {
    return rejected(error);
  }
}
