import { expect, test } from "@playwright/test";

/**
 * Every misuse the package rejects at runtime, and the words it rejects it
 * with. What the types already refuse — a schema that is not a shape of
 * Standard Schemas, a `space` prop that `createEnvSpace()` did not produce —
 * is pinned down in `typetest/` instead.
 */
const guards = {
  "async-schema": [
    'Key "APP_NAME" of the "guard-async" env space validates asynchronously.',
    "give the key a schema without async refinements",
  ],
  "duplicate-name": [
    'Env space "guard-duplicate" is created twice with different keys.',
    'Pass a unique "name" option to createEnvSpace().',
  ],
  "unknown-key": [
    'Key "NOPE" is not in the "public" env space.',
    "It has APP_NAME",
  ],
} as const;

test.describe("a misuse of the API", () => {
  for (const [name, fragments] of Object.entries(guards)) {
    test(`is rejected: ${name}`, async ({ page }) => {
      await page.goto("/guards");

      await Promise.all(
        fragments.map((fragment) =>
          expect(page.getByTestId(name)).toContainText(fragment),
        ),
      );
    });
  }
});
