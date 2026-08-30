import { recallInstrumentationReads } from "@/contexts";

export function GET(): Response {
  return Response.json(recallInstrumentationReads() ?? null);
}
