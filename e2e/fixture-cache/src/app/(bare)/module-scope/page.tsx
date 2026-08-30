import { moduleScopeAppName } from "@/module-scope-env";

/**
 * Renders a module-scope read into a page that stays static. This is the
 * documented capture: the page bakes the value the build machine saw, which
 * is why rendering a module-scope read into a prerender is the anti-pattern —
 * the read itself is fine.
 */
export default function ModuleScopePage() {
  return (
    <main>
      <p data-testid="module-scope-app-name">{moduleScopeAppName}</p>
    </main>
  );
}
