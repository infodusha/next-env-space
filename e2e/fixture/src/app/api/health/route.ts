export const dynamic = "force-dynamic";

/** Touches no env space, so the test runner can wait on it. */
export function GET(): Response {
  return Response.json({ ok: true });
}
