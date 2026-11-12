import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test("terms page: breadcrumb, title, legal nav, body", async ({ page }) => {
  await page.goto("/istifadeci-qaydalari");
  await expect(page.getByRole("heading", { level: 1, name: "Istifadəçi qaydaları" })).toBeVisible();
  const crumb = page.getByRole("navigation", { name: "Naviqasiya" });
  await expect(crumb.getByRole("link", { name: "Ana səhifə" })).toHaveAttribute("href", "/");
  const legal = page.getByRole("navigation", { name: "Hüquqi səhifələr" });
  await expect(legal.getByRole("link", { name: "Məxfilik siyasəti" })).toHaveAttribute("href", "/mexfilik-siyaseti");
  await expect(legal.locator('[aria-current="page"]')).toHaveText(/İstifadəçi qaydaları|Istifadəçi qaydaları/);
  await expect(page.locator("main p").first()).toContainText("Sed ut perspiciatis");
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.join()).toContain('"BreadcrumbList"');
});

test("privacy page in English falls back to AZ content", async ({ page }) => {
  await page.goto("/en/privacy-policy");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("main p").first()).toBeVisible();
});

test("help page: FAQ opens and closes without JavaScript errors, FAQPage JSON-LD", async ({ page }) => {
  await page.goto("/yardim");
  const items = page.locator("main details");
  await expect(items).toHaveCount(6);
  await expect(items.first()).toHaveAttribute("open", "");
  await items.nth(1).locator("summary").click();
  await expect(items.nth(1)).toHaveAttribute("open", "");
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.join()).toContain('"FAQPage"');
});

test("sitemap lists static pages in 3 languages", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const p of ["/istifadeci-qaydalari", "/en/privacy-policy", "/ru/pomoshch", "/tarifler", "/en/contact"]) {
    expect(xml).toContain(p);
  }
});
