import { brokenPairEnv } from "@/env.server";

export const dynamic = "force-dynamic";

/** Two values fail the schema, and the error has to name both. */
export function GET(): Response {
  try {
    return Response.json({ value: brokenPairEnv.get("BROKEN_COUNT") });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
