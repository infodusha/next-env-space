import { expect, test } from "@playwright/test";

/** Every misuse the package rejects, and the words it rejects it with. */
const guards = {
  "not-an-object": [
    'Env space "guard-string" needs a shape ({ FOO: z.string() }) or a z.object() around one.',
  ],
  "zod-type": [
    'Env space "guard-record" was created with a z.record() schema.',
    "Pass a shape ({ FOO: z.string() }) or a z.object() around one.",
  ],
  "not-a-zod-type": [
    'Key "GUARD_VALUE" of the "guard-value" env space is not a zod type.',
    "Every key parses with its own type, as in { GUARD_VALUE: z.string() }.",
  ],
  "uncalled-zod-type": [
    'Key "GUARD_VALUE" of the "guard-uncalled" env space is not a zod type.',
    "Call it, as in { GUARD_VALUE: z.string() }.",
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
