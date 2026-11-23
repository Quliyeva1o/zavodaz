// Screenshots every target element at the Figma frame widths (desktop 1440, mobile 320).
// Usage: npm run visual:capture   (production server on E2E_BASE_URL, default http://localhost:3100)
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { cropHeight, runOpen, selectTargets } from "./target-lib.mjs";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 320, height: 568 } };
const targets = selectTargets(JSON.parse(await readFile("tests/visual/targets.json", "utf8")), process.env.VISUAL_ONLY);

// --disable-lcd-text: grayscale text anti-aliasing like Figma's export. Windows Chrome otherwise
// draws ClearType colour fringes on every glyph, which pixelmatch counts as differences.
const browser = await chromium.launch({ channel: "chrome", args: ["--disable-lcd-text"] });
for (const t of targets) {
  const page = await browser.newPage({ viewport: VIEWPORTS[t.bp], deviceScaleFactor: 1 });
  await page.goto(base + t.path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await runOpen(page, t.open);
  if (t.waitFor) await page.locator(t.waitFor).first().waitFor({ state: "visible" });
  const el = page.locator(t.selector).first();
  await el.waitFor({ state: "visible" });
  await mkdir(`test-results/visual/${t.bp}`, { recursive: true });
  const path = `test-results/visual/${t.bp}/${t.name}.png`;
  const crop = cropHeight(t.crop);
  if (crop === null) {
    await el.screenshot({ path, animations: "disabled", caret: "hide" });
  } else {
    // Top `crop` px of the element, same rounding as an element screenshot (page coordinates).
    await el.scrollIntoViewIfNeeded();
    const b = await el.evaluate((e) => {
      const r = e.getBoundingClientRect();
      return { x: r.left + scrollX, y: r.top + scrollY, width: r.width };
    });
    const x = Math.floor(b.x + 1e-3);
    const y = Math.floor(b.y + 1e-3);
    await page.screenshot({ path, fullPage: true, clip: { x, y, width: Math.ceil(b.x + b.width - 1e-3) - x, height: crop }, animations: "disabled", caret: "hide" });
  }
  console.log(`${t.bp}/${t.name}`);
  await page.close();
}
await browser.close();
