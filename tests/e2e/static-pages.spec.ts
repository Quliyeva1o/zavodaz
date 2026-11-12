import { expect, test } from "@playwright/test";
import { defaultPages } from "../../src/features/pages/defaults";

test.use({ viewport: { width: 1440, height: 900 } });

test("terms page: breadcrumb, title, legal nav, body", async ({ page }) => {
  const res = await page.goto("/istifadeci-qaydalari");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Istifadəçi qaydaları" })).toBeVisible();
  const crumb = page.getByRole("navigation", { name: "Naviqasiya" });
  await expect(crumb.getByRole("link", { name: "Ana səhifə" })).toHaveAttribute("href", "/");
  const legal = page.getByRole("navigation", { name: "Hüquqi səhifələr" });
  await expect(legal.getByRole("link", { name: "Məxfilik siyasəti" })).toHaveAttribute("href", "/mexfilik-siyaseti");
  await expect(legal.locator('[aria-current="page"]')).toHaveText(/İstifadəçi qaydaları|Istifadəçi qaydaları/);
  await expect(page.locator("main p").first()).toContainText("Sed ut perspiciatis");
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.join()).toContain('"BreadcrumbList"');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/istifadeci-qaydalari$/);
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /\/en\/terms-of-use$/);
});

test("privacy page in English falls back to AZ content", async ({ page }) => {
  const res = await page.goto("/en/privacy-policy");
  expect(res?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(defaultPages.privacy.title.az);
  await expect(page.locator("main p").first()).toContainText("Sed ut perspiciatis");
});

test("help page: FAQ opens and closes without JavaScript errors, FAQPage JSON-LD", async ({ page }) => {
  const errors: Error[] = [];
  page.on("pageerror", (e) => errors.push(e));
  const res = await page.goto("/yardim");
  expect(res?.status()).toBe(200);
  const items = page.locator("main details");
  await expect(items).toHaveCount(6);
  await expect(items.first()).toHaveAttribute("open", "");
  await items.nth(1).locator("summary").click();
  await expect(items.nth(1)).toHaveAttribute("open", "");
  await items.nth(1).locator("summary").click();
  await expect(items.nth(1)).not.toHaveAttribute("open", "");
  await expect(items.first()).toHaveAttribute("open", "");
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  const faq = ld.map((t) => JSON.parse(t)).find((d) => d["@type"] === "FAQPage");
  expect(faq.mainEntity.filter((q: { "@type": string }) => q["@type"] === "Question")).toHaveLength(6);
  expect(errors).toEqual([]);
});

test("sitemap lists static pages in 3 languages", async ({ request }) => {
  const r = await request.get("/sitemap.xml");
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toContain("xml");
  const xml = await r.text();
  for (const p of ["/istifadeci-qaydalari", "/en/privacy-policy", "/ru/pomoshch", "/tarifler", "/en/contact"]) {
    expect(xml).toContain(p);
  }
});
