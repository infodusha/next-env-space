/**
 * A dynamic `import()` in a Server Component: the imported module runs its
 * module scope during the render, on the first request that reaches it.
 */
export const dynamic = "force-dynamic";

export default async function LazyImportPage() {
  let text: string;

  try {
    const { lazyAppName } = await import("@/lazy-env");
    text = `ok:${lazyAppName}`;
  } catch (error) {
    text = `err:${error instanceof Error ? error.message : String(error)}`;
  }

  return (
    <main>
      <p data-testid="lazy-app-name">{text}</p>
    </main>
  );
}
