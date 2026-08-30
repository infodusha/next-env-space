import { expect, test } from "@playwright/test";

/** Every misuse the package rejects, and the words it rejects it with. */
const guards = {
  "not-an-object": [
    'Env space "guard-string" needs a shape with a Standard Schema per key, as in { FOO: z.string() }.',
  ],
  "single-schema": [
    'Env space "guard-record" was created with a single zod schema.',
    "Pass a shape with a Standard Schema per key, as in { FOO: z.string() }.",
  ],
  "not-a-schema": [
    'Key "GUARD_VALUE" of the "guard-value" env space is not a Standard Schema.',
    "Every key parses with its own Standard Schema, as in { GUARD_VALUE: z.string() }.",
  ],
  "uncalled-schema": [
    'Key "GUARD_VALUE" of the "guard-uncalled" env space is not a Standard Schema.',
    "Call it, as in { GUARD_VALUE: z.string() }.",
  ],
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
  "missing-space": [
    'The "space" prop needs an env space created by createEnvSpace().',
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
