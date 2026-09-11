const errorDocumentId = "__next_error__";

export function isErrorDocument(): boolean {
  return (
    typeof document !== "undefined" &&
    document.documentElement.id === errorDocumentId
  );
}

const errorDocumentReads = new WeakSet<Error>();

export function errorDocumentReadError(name: string): Error {
  const error = new Error(
    `Env space "${name}" is missing on the client: the server render of this page failed ` +
      `before its shell was ready, so nothing it publishes reached the browser, a ` +
      `<ClientEnvScript /> included if the page renders one. Fix that failure first; Next shows ` +
      `it once the page boots. So that a read at module scope of instrumentation-client.ts ` +
      `does not stop that boot, get() and getAll() answer undefined here and report this error ` +
      `once the page has booted, while getAsync() rejects with it. The space still needs ` +
      `<ClientEnvScript space={...} /> above the components that read it.`,
  );
  errorDocumentReads.add(error);
  return error;
}

export function isErrorDocumentReadError(error: unknown): error is Error {
  return error instanceof Error && errorDocumentReads.has(error);
}

const reported = new Set<string>();

export function reportAfterBoot(name: string, error: Error): void {
  if (reported.has(name)) {
    return;
  }
  reported.add(name);

  setTimeout(() => {
    throw error;
  });
}
