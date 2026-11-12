import { expect, test } from "@playwright/test";

test("home has lang, canonical and hreflang", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en$/);
  await expect(page.locator('link[rel="alternate"][hreflang="az"]')).toHaveAttribute("href", /:\d+\/?$|\.az\/?$/);
  await expect(page.locator('link[rel="alternate"][hreflang="ru"]')).toHaveAttribute("href", /\/ru$/);
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
  await expect(page).toHaveTitle("Zavod.az — Industrial platform of Azerbaijan");
});

test("/az redirects to / with 308", async ({ request }) => {
  const res = await request.get("/az", { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers()["location"]).toBe("/");
});

test("unknown page answers 404 with the site layout", async ({ page }) => {
  const res = await page.goto("/yoxdur");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Səhifə tapılmadı" })).toBeVisible();
  await expect(page.locator("header")).toBeVisible();
});

test("test copy is closed to search engines", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toMatch(/^Disallow: \/$/m);
  const home = await request.get("/");
  expect(home.headers()["x-robots-tag"]).toBe("noindex, nofollow");
});
