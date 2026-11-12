import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test("tariffs page shows 3 plans from the database", async ({ page }) => {
  await page.goto("/tarifler");
  await expect(page.getByRole("heading", { level: 1, name: "Tariflər" })).toBeVisible();
  for (const name of ["Standart", "Premium", "VİP"]) await expect(page.getByText(name, { exact: true })).toBeVisible();
  await expect(page.getByText("Pulsuz", { exact: true })).toBeVisible();
  await expect(page.getByText("7.99₼")).toBeVisible();
  await expect(page.getByText("9.99₼")).toBeVisible();
  await expect(page.getByRole("link", { name: "İndi qoşul" })).toHaveCount(2);
});

test("join as a new visitor leads to registration with the plan", async ({ page }) => {
  await page.goto("/tarifler");
  const res = await page.request.get("/api/join?plan=premium&lang=az", { maxRedirects: 0 });
  expect(res.status()).toBe(303);
  expect(res.headers()["location"]).toMatch(/\/qeydiyyat\?plan=premium$/);
});

test("join from a known device leads to login", async ({ context, page }) => {
  await context.addCookies([{ name: "zv_known", value: "1", url: "http://localhost:3100" }]);
  const res = await page.request.get("/api/join?plan=vip&lang=en", { maxRedirects: 0 });
  expect(res.headers()["location"]).toContain("/en/login?next=");
});
