// Screenshots every target element at the Figma frame widths (desktop 1440, mobile 320).
// Usage: npm run visual:capture   (production server on E2E_BASE_URL, default http://localhost:3100)
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 320, height: 568 } };
const targets = JSON.parse(await readFile("tests/visual/targets.json", "utf8"));

const browser = await chromium.launch({ channel: "chrome" });
for (const t of targets) {
  const page = await browser.newPage({ viewport: VIEWPORTS[t.bp], deviceScaleFactor: 1 });
  await page.goto(base + t.path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (t.open) await page.click(t.open);
  if (t.waitFor) await page.locator(t.waitFor).first().waitFor({ state: "visible" });
  const el = page.locator(t.selector).first();
  await el.waitFor({ state: "visible" });
  await mkdir(`test-results/visual/${t.bp}`, { recursive: true });
  await el.screenshot({ path: `test-results/visual/${t.bp}/${t.name}.png`, animations: "disabled", caret: "hide" });
  console.log(`${t.bp}/${t.name}`);
  await page.close();
}
await browser.close();
