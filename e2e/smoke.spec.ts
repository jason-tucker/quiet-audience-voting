import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("status endpoint responds", async ({ request }) => {
    const res = await request.get("/api/status");
    expect(res.status()).toBeLessThan(500);
  });
});
