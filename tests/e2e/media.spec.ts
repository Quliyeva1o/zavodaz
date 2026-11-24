import { expect, test } from "@playwright/test";

test("media route answers 404 for traversal, bad names and unknown ids", async ({ request }) => {
  for (const p of [
    "/media/../x",
    "/media/%2e%2e/%2e%2e/etc/passwd",
    "/media/0b8f7a7e-0000-4000-8000-000000000001/640.png",
    "/media/0b8f7a7e-0000-4000-8000-000000000001/640.webp",
    "/media/0b8f7a7e-0000-4000-8000-000000000001/..%2f640.webp",
    "/media/0b8f7a7e-0000-4000-8000-000000000001",
    "/media",
  ]) {
    const res = await request.get(p, { maxRedirects: 0 });
    expect(res.status(), p).toBe(404);
  }
});
