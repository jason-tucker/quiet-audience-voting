import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("status endpoint responds", async ({ request }) => {
    const res = await request.get("/api/status");
    expect(res.status()).toBeLessThan(500);
  });

  test("health endpoint responds with expected shape", async ({ request }) => {
    const res = await request.get("/api/health");
    expect([200, 503]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty("ok");
    expect(body.checks).toHaveProperty("database");
    expect(body.checks).toHaveProperty("migrations");
    expect(body.checks).toHaveProperty("uploads_writable");
    expect(body.checks).toHaveProperty("disk");
  });
});
