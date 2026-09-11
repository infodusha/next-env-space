import { readSync } from "@/contexts";

/**
 * Statically generated on demand: no params at build time, so the first
 * request runs the handler on the running server, as a prerender that is
 * cached from then on. It reads that server's environment, so the guard that
 * rejects a read in a Route Handler `next build` prerenders stays quiet here.
 */
export const revalidate = 3600;

export function generateStaticParams(): { slug: string }[] {
  return [];
}

export function GET(): Response {
  return Response.json({ sync: readSync() });
}
