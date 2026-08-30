import { readBoth } from "@/contexts";

/** Prerendered once at build: both reads answer with the build machine's value. */
export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  return Response.json(await readBoth());
}
