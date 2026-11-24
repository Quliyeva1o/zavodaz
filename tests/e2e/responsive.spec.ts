import { expect, test } from "@playwright/test";
import { clearCatalogFixture, seedCatalogFixture } from "./db";

const paths = ["/", "/istifadeci-qaydalari", "/mexfilik-siyaseti", "/yardim", "/tarifler", "/elaqe", "/en/contact", "/en/help", "/en/terms-of-use", "/en/pricing"];
const widths = [1024, 1180, 1280, 1366, 1440, 320, 375, 768];

for (const path of paths) {
  for (const width of widths) {
    test(`${path} @${width}px: üfüqi daşma yoxdur`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
      expect(m.scroll, `scrollWidth ${m.scroll} > innerWidth ${m.inner}`).toBeLessThanOrEqual(m.inner);
    });
  }
}

// Əlaqə: info sütunu ilə forma arasında ən azı 32px boşluq; 1440-da Figma-dakı 98px (617 + 98 + 605 = 1320).
for (const [width, min, max] of [[1024, 32, 98], [1180, 32, 98], [1280, 32, 98], [1440, 98, 98]] as const) {
  test(`/elaqe @${width}px: sütunlar arası boşluq ${min === max ? `${min}px` : `≥ ${min}px`}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/elaqe");
    await page.evaluate(() => document.fonts.ready);
    const gap = await page.evaluate(() => {
      const grid = document.querySelector("[data-figma=contact-body] > div")!;
      const [head, form, info] = [...grid.children].map((c) => c.getBoundingClientRect());
      return Math.round(form.left - Math.max(head.right, info.right));
    });
    expect(gap).toBeGreaterThanOrEqual(min);
    expect(gap).toBeLessThanOrEqual(max);
  });
}

// Kataloq: sidebar 303 + 32 + qrid (1440-da 3 sütun, 1024–1279 arası 2); kartlar fixture-dan (R1).
test.describe("/kataloq", () => {
  test.beforeAll(async () => {
    test.setTimeout(30_000);
    await seedCatalogFixture();
  });
  test.afterAll(async () => {
    test.setTimeout(30_000);
    await clearCatalogFixture();
  });
  for (const width of [1024, 1280, 1439, 320, 768]) {
    test(`/kataloq @${width}px: üfüqi daşma yoxdur`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const res = await page.goto("/kataloq");
      expect(res?.status()).toBe(200);
      await expect(page.locator("main article").first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
      expect(m.scroll, `scrollWidth ${m.scroll} > innerWidth ${m.inner}`).toBeLessThanOrEqual(m.inner);
    });
  }
});
