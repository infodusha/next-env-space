import type { Metadata } from "next";

import { readSync } from "@/contexts";

/** `get()` inside generateMetadata: the render guard catches it, at build time. */
export function generateMetadata(): Metadata {
  return { title: readSync() };
}

export default function Page() {
  return <p>generateMetadata with get()</p>;
}
