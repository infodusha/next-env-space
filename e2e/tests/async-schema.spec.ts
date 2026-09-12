import { expect, test } from "@playwright/test";

import { runtimeEnv } from "../env.js";
import { readEnvSpaces } from "../html.js";

/** What the async transform of ASYNC_VALUE turns the runtime value into. */
const transformed = runtimeEnv.ASYNC_VALUE.toUpperCase();

test.describe("a key whose schema validates asynchronously", () => {
  test("is awaited by getAsync() and getAllAsync() in a Server Component", async ({
    page,
  }) => {
    await page.goto("/async-schema");

    await expect(page.getByTestId("server-async-value")).toHaveText(
      transformed,
    );
    await expect(page.getByTestId("server-async-all")).toHaveText(
      `${transformed} ${runtimeEnv.ASYNC_SIBLING}`,
    );
  });

  test("is awaited by use() in a client component, under a Suspense boundary", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/async-schema");

    await expect(page.getByTestId("client-async-value")).toHaveText(
      transformed,
    );
    await expect(page.getByTestId("client-async-sibling")).toHaveText(
      runtimeEnv.ASYNC_SIBLING,
    );
    expect(errors).toEqual([]);
  });

  test("is refused by get() in the browser, which points at getAsync()", async ({
    page,
  }) => {
    await page.goto("/async-schema");

    await expect(page.getByTestId("client-async-get")).toContainText(
      'err:Key "ASYNC_VALUE" of the "async" env space validates asynchronously',
    );
    await expect(page.getByTestId("client-async-get")).toContainText(
      "Use getAsync() instead.",
    );
  });

  test("travels raw, and is transformed again in the browser", async ({
    request,
  }) => {
    const html = await (await request.get("/async-schema")).text();

    expect(readEnvSpaces(html)).toEqual({
      async: {
        ASYNC_VALUE: runtimeEnv.ASYNC_VALUE,
        ASYNC_SIBLING: runtimeEnv.ASYNC_SIBLING,
      },
    });
  });
});
