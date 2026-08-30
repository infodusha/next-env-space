import { connection } from "next/server";

/** Touches no env space, so the test runner can wait on it. */
export async function GET(): Promise<Response> {
  await connection();
  return Response.json({ ok: true });
}
