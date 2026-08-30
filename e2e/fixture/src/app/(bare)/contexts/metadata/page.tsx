import type { Metadata } from "next";

import { readAsync } from "@/contexts";

/** `getAsync()` inside generateMetadata: works, and makes the route dynamic. */
export async function generateMetadata(): Promise<Metadata> {
  return { title: await readAsync() };
}

export default function Page() {
  return <p>generateMetadata with getAsync()</p>;
}
