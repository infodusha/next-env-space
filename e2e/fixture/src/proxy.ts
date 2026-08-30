import { NextResponse, type NextRequest } from "next/server";

import { readBoth } from "@/contexts";

/**
 * A strict CSP on /csp only: the env script has to carry the nonce to run at
 * all, so the client read on that page fails without it. /contexts/proxy is
 * answered here directly, to show both reads work in the proxy itself.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (request.nextUrl.pathname === "/contexts/proxy") {
    return NextResponse.json(await readBoth());
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/csp", "/contexts/proxy"],
};
