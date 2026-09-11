/**
 * The same dynamic `import()` as /lazy-import, on a page nothing keeps off the
 * build: the module scope of the imported module runs inside the build-time
 * prerender, so the guard rejects the read, and its message is what the build
 * bakes into the static HTML.
 */
export default async function StaticLazyImportPage() {
  let text: string;

  try {
    const { lazyStaticAppName } = await import("@/lazy-static-env");
    text = `ok:${lazyStaticAppName}`;
  } catch (error) {
    text = `err:${error instanceof Error ? error.message : String(error)}`;
  }

  return (
    <main>
      <p data-testid="lazy-static-app-name">{text}</p>
    </main>
  );
}
