interface FulfilledThenable<TValue> extends Promise<TValue> {
  status: "fulfilled";
  value: TValue;
}

interface RejectedThenable extends Promise<never> {
  status: "rejected";
  reason: unknown;
}

export function fulfilled(): Promise<void>;
export function fulfilled<TValue>(value: TValue): Promise<TValue>;
export function fulfilled(value?: unknown): Promise<unknown> {
  const promise = Promise.resolve(value) as FulfilledThenable<unknown>;
  promise.status = "fulfilled";
  promise.value = value;
  return promise;
}

export function rejected(reason: unknown): Promise<never> {
  const promise = Promise.reject(reason) as RejectedThenable;
  promise.status = "rejected";
  promise.reason = reason;
  promise.catch(() => {});
  return promise;
}

export function isFulfilled(promise: Promise<unknown>): boolean {
  return (promise as { status?: unknown }).status === "fulfilled";
}
