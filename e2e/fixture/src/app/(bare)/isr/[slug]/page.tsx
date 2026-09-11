import { publicEnv } from "@/env";

/**
 * Statically generated on demand: no params at build time, so the first
 * request renders the page on the running server — a prerender, cached from
 * then on. It reads the environment of that server, not of the build machine,
 * so the guard lets `get()` through there.
 */
export const revalidate = 3600;

export function generateStaticParams(): { slug: string }[] {
  return [];
}

export default async function IsrPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let message: string;

  try {
    message = `ok:${publicEnv.get("APP_NAME")}`;
  } catch (error) {
    message = `err:${error instanceof Error ? error.message : String(error)}`;
  }

  return (
    <main>
      <p data-testid="slug">{slug}</p>
      <pre data-testid="message">{message}</pre>
    </main>
  );
}
