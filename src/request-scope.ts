export function isMissingRequestScope(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error as { __NEXT_ERROR_CODE?: unknown }).__NEXT_ERROR_CODE === "E251"
  );
}
