// Screenshots every target element at the Figma frame widths (desktop 1440, mobile 320).
// Usage: npm run visual:capture   (production server on E2E_BASE_URL, default http://localhost:3100)
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { YT_STILL, cropHeight, runOpen, loadTargets, setCookies, videoStillLayout } from "./target-lib.mjs";

/** `videoStill`: answers the i.ytimg.com preview with Figma's still, laid out for the preview's box (target-lib). */
async function routeVideoStill(page, file) {
  const still = await readFile(file);
  const meta = await sharp(still).metadata();
  await page.route("https://i.ytimg.com/**", async (route) => {
    const box = await page.evaluate(() => {
      const r = document.querySelector('img[src^="https://i.ytimg.com/"]').parentElement.getBoundingClientRect();
      return { width: r.width, height: r.height };
    });
    // Drawn 4× larger than YouTube's 480×360: only the aspect ratio matters for the layout, the extra pixels keep it sharp.
    const at = videoStillLayout(box, meta);
    const k = 4;
    const drawn = await sharp(still).resize(at.width * k, at.height * k, { fit: "fill" }).toBuffer();
    const body = await sharp({ create: { width: YT_STILL.width * k, height: YT_STILL.height * k, channels: 3, background: "#000" } })
      .composite([{ input: drawn, left: at.left * k, top: at.top * k }])
      .jpeg({ quality: 95 })
      .toBuffer();
    await route.fulfill({ status: 200, contentType: "image/jpeg", body });
  });
}

const base = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 320, height: 568 } };
const targets = loadTargets(JSON.parse(await readFile("tests/visual/targets.json", "utf8")), process.env.VISUAL_ONLY);

// --disable-lcd-text: grayscale text anti-aliasing like Figma's export. Windows Chrome otherwise
// draws ClearType colour fringes on every glyph, which pixelmatch counts as differences.
const browser = await chromium.launch({ channel: "chrome", args: ["--disable-lcd-text"] });
for (const t of targets) {
  const page = await browser.newPage({ viewport: VIEWPORTS[t.bp], deviceScaleFactor: 1 });
  await setCookies(page, t.cookies, base);
  if (t.videoStill) await routeVideoStill(page, t.videoStill);
  await page.goto(base + t.path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await runOpen(page, t.open);
  // The last click leaves the pointer over a control (the rating dialog's button): no hover state in the screenshot.
  if (t.open) await page.mouse.move(0, 0);
  if (t.waitFor) await page.locator(t.waitFor).first().waitFor({ state: "visible" });
  const el = page.locator(t.selector).first();
  await el.waitFor({ state: "visible" });
  // Lazy images below the fold: load them all before the screenshot (each waits ≤ 10 s).
  await el.evaluate((root) =>
    Promise.all(
      [...root.querySelectorAll("img")].map((img) => {
        img.loading = "eager";
        return Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 10_000))]);
      }),
    ),
  );
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
