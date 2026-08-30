import { expect, test } from "@playwright/test";

test("a value the schema rejects names itself and its space", async ({
  request,
}) => {
  const response = await request.get("/api/broken");

  expect(response.status()).toBe(500);
  expect(await response.json()).toEqual({
    message:
      'Environment variable BROKEN_URL of the "broken" env space is not valid: Invalid URL',
  });
});

test("two bad values are reported together, not one per restart", async ({
  request,
}) => {
  const response = await request.get("/api/broken-pair");

  expect(response.status()).toBe(500);
  const { message } = (await response.json()) as { message: string };

  expect(message).toContain(
    '2 environment variables of the "broken-pair" env space are not valid',
  );
  expect(message).toContain("BROKEN_URL: Invalid URL");
  expect(message).toContain("BROKEN_COUNT:");
});
