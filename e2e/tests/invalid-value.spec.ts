import { expect, test } from "@playwright/test";

test("a value the schema rejects names itself", async ({ request }) => {
  const response = await request.get("/api/broken");

  expect(response.status()).toBe(500);
  expect(await response.json()).toEqual({
    message: "Environment variable BROKEN_URL is not valid: Invalid URL",
  });
});
