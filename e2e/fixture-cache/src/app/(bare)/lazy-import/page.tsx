import { connection } from "next/server";

/**
 * A dynamic `import()` in a Server Component, after the render has opted out
 * of the static shell: the imported module runs its module scope inside the
 * dynamic render, on the first request that reaches it.
 */
export default async function LazyImportPage() {
  await connection();

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
