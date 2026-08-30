interface FulfilledThenable<TValue> extends Promise<TValue> {
  status: "fulfilled";
  value: TValue;
}

export function fulfilled<TValue>(value: TValue): Promise<TValue> {
  const promise = Promise.resolve(value) as FulfilledThenable<TValue>;
  promise.status = "fulfilled";
  promise.value = value;
  return promise;
}

export function isFulfilled(promise: Promise<unknown>): boolean {
  return (promise as { status?: unknown }).status === "fulfilled";
}
