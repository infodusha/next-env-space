import { brokenEnv } from "@/env.server";

export const dynamic = "force-dynamic";

/** The space is backed by a value the schema rejects. */
export function GET(): Response {
  try {
    return Response.json({ value: brokenEnv.getEnv("BROKEN_URL") });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
