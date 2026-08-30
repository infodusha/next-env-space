import Link from "next/link";

import { PublicEnvView } from "@/components/public-env-view";

export default function ClientPage() {
  return (
    <main>
      <h1>client</h1>
      <PublicEnvView />
      <Link href="/">to home page</Link>
    </main>
  );
}
