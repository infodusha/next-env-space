import {
  moduleScopeAppName,
  moduleScopeAppNameAsync,
} from "@/module-scope-env";

/**
 * Renders a module-scope read into a page that stays static. This is the
 * documented capture: next build parses nothing, so the constants held
 * undefined while the page was prerendered, and the static HTML shows an
 * empty spot where the runtime value belongs — which is why rendering a
 * module-scope read into a prerender is the anti-pattern; the read itself is
 * fine.
 */
export default function ModuleScopePage() {
  return (
    <main>
      <p data-testid="module-scope-app-name">{moduleScopeAppName}</p>
      <p data-testid="module-scope-app-name-async">{moduleScopeAppNameAsync}</p>
    </main>
  );
}
