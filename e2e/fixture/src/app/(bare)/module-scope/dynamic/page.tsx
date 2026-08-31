import {
  moduleScopeAppName,
  moduleScopeAppNameAsync,
} from "@/module-scope-env";

/**
 * The same module-scope constant on a dynamic route: the server process
 * evaluated the module again, so the runtime value has to show here.
 */
export const dynamic = "force-dynamic";

export default function DynamicModuleScopePage() {
  return (
    <main>
      <p data-testid="module-scope-app-name">{moduleScopeAppName}</p>
      <p data-testid="module-scope-app-name-async">{moduleScopeAppNameAsync}</p>
    </main>
  );
}
