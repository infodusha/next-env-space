import { readBoth } from "@/contexts";

/** Prerendered once at build: the guard rejects both reads, into the baked response. */
export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  return Response.json(await readBoth());
}
