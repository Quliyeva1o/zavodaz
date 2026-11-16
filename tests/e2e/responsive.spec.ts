import { expect, test } from "@playwright/test";

const paths = ["/", "/istifadeci-qaydalari", "/mexfilik-siyaseti", "/yardim", "/tarifler", "/elaqe", "/en/contact"];
const widths = [1024, 1180, 1280, 1366, 1440, 320, 375, 768];

for (const path of paths) {
  for (const width of widths) {
    test(`${path} @${width}px: üfüqi daşma yoxdur`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
      expect(m.scroll, `scrollWidth ${m.scroll} > innerWidth ${m.inner}`).toBeLessThanOrEqual(m.inner);
    });
  }
}
