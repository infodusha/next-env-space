/** Defines a global — `window`, `document` — for the duration of `run`, then removes it. */
export async function withGlobal<TResult>(
  name: string,
  value: unknown,
  run: () => TResult | Promise<TResult>,
): Promise<TResult> {
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true,
  });
  try {
    return await run();
  } finally {
    Reflect.deleteProperty(globalThis, name);
  }
}
