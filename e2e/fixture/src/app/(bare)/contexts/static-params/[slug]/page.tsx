import { readAsync, readSync } from "@/contexts";

/**
 * generateStaticParams runs at build only, so its outcome can only leave the
 * build as a route: the one slug it emits spells out what each read did —
 * `guarded` when the guard named generateStaticParams in its refusal.
 * Everything else is a 404.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const sync = tag("sync", readSync());
  const async = tag("async", await readAsync());
  return [{ slug: `${sync}--${async}` }];
}

export const dynamicParams = false;

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <p data-testid="slug">{slug}</p>;
}

function tag(label: string, result: string): string {
  if (result.startsWith("ok:")) {
    return `${label}-ok-${result.slice("ok:".length)}`;
  }
  return result.includes("generateStaticParams")
    ? `${label}-guarded`
    : `${label}-err`;
}
