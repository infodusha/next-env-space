import { connection } from "next/server";

import { moduleScopeAppName } from "@/module-scope-env";

/**
 * The same module-scope constant on a dynamic route: the server process
 * evaluated the module again, so the runtime value has to show here.
 */
export default async function DynamicModuleScopePage() {
  await connection();

  return (
    <main>
      <p data-testid="module-scope-app-name">{moduleScopeAppName}</p>
    </main>
  );
}
