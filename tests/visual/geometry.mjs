// Geometry check (spec 1.1 item 6a): every visible Figma text node must sit at the same place
// (x, y relative to the target) with the same box height on the site, ±1px; the target itself
// must have the Figma size (rounded up like the reference PNG export).
// Usage: npm run visual:geometry   (production server on E2E_BASE_URL, default http://localhost:3100)
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { findNode, getNodes } from "../../scripts/figma/api.mts";

const TOLERANCE = 1;
const base = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 320, height: 568 } };
const targets = JSON.parse(await readFile("tests/visual/targets.json", "utf8"));

// Figma nodes: live /nodes API first, the local file copy (design/.cache/file.json) as fallback.
let figma, source;
try {
  const nodes = await getNodes(targets.map((t) => t.node));
  figma = Object.fromEntries(Object.entries(nodes).map(([id, n]) => [id, n.document]));
  source = "Figma /nodes API";
} catch (error) {
  console.warn(`Figma API failed (${error.message.split("\n")[0]}), using design/.cache/file.json`);
  const file = JSON.parse(await readFile("design/.cache/file.json", "utf8"));
  figma = Object.fromEntries(targets.map((t) => [t.node, findNode(file.document, t.node)]));
  source = `design/.cache/file.json (Figma version ${file.lastModified})`;
}
console.log(`Figma source: ${source}\n`);

/** Visible TEXT nodes in tree order, boxes relative to the root. */
function figmaTexts(root) {
  const o = root.absoluteBoundingBox;
  const out = [];
  (function visit(n) {
    if (n.visible === false) return;
    if (n.type === "TEXT") {
      const b = n.absoluteBoundingBox;
      out.push({ text: n.characters.replace(/\s+/g, " ").trim(), x: b.x - o.x, y: b.y - o.y, h: b.height });
    }
    for (const c of n.children ?? []) visit(c);
  })(root);
  return out;
}

/**
 * Site text boxes inside the target, in document order. The box of a text is its element's
 * content box when that element holds just the text line(s) (no child elements, not inline, no
 * taller than its line box + 1px) — e.g. a 22.363px menu item. Otherwise (text next to an icon,
 * inline links, text centred in a taller button) it is the text's line box: x of the first glyph,
 * y/height of the line(s) computed from the glyph rect and the line-height.
 */
function siteTexts(selector) {
  const root = document.querySelector(selector);
  const o = root.getBoundingClientRect();
  const out = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.data.replace(/\s+/g, " ").trim();
    const el = node.parentElement;
    if (!text || !el.checkVisibility()) continue;
    const cs = getComputedStyle(el);
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()];
    const r = range.getBoundingClientRect();
    const lineHeight = parseFloat(cs.lineHeight);
    const lines = new Set(rects.map((q) => Math.round(q.top))).size;
    const lineBox = { x: r.left, y: rects[0].top - (lineHeight - rects[0].height) / 2, h: lineHeight * lines };
    const box = el.getBoundingClientRect();
    const px = (k) => parseFloat(cs[k]);
    const content = {
      x: box.left + px("borderLeftWidth") + px("paddingLeft"),
      y: box.top + px("borderTopWidth") + px("paddingTop"),
      h: box.height - px("borderTopWidth") - px("paddingTop") - px("paddingBottom") - px("borderBottomWidth"),
    };
    const ownBox = cs.display !== "inline" && el.children.length === 0 && content.h <= lineBox.h + 1;
    const b = ownBox ? content : lineBox;
    out.push({ text, x: b.x - o.left, y: b.y - o.top, h: b.h });
  }
  return { texts: out, width: o.width, height: o.height, top: o.top, left: o.left };
}

// Same rounding as the reference PNG (Figma export) and the element screenshot.
const figmaPx = (v) => Math.ceil(v - 1e-3);
const sitePx = (start, size) => Math.ceil(start + size - 1e-3) - Math.floor(start + 1e-3);
const r2 = (v) => Math.round(v * 100) / 100;

const browser = await chromium.launch({ channel: "chrome" });
const report = { source, tolerance: TOLERANCE, targets: [] };
let failed = false;
for (const t of targets) {
  const root = figma[t.node];
  const fb = root.absoluteBoundingBox;
  const page = await browser.newPage({ viewport: VIEWPORTS[t.bp], deviceScaleFactor: 1 });
  await page.goto(base + t.path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (t.open) await page.click(t.open);
  await page.locator(t.selector).first().waitFor({ state: "visible" });
  const site = await page.evaluate(siteTexts, t.selector);
  await page.close();

  const size = {
    figma: `${figmaPx(fb.width)}x${figmaPx(fb.height)}`,
    site: `${sitePx(site.left, site.width)}x${sitePx(site.top, site.height)}`,
  };
  size.ok = size.figma === size.site;

  const used = new Set();
  const rows = figmaTexts(root).map((f) => {
    const i = site.texts.findIndex((s, k) => !used.has(k) && s.text === f.text);
    if (i < 0) return { text: f.text, figma: `${r2(f.x)}/${r2(f.y)}/${r2(f.h)}`, site: "—", delta: "unmatched", ok: false };
    used.add(i);
    const s = site.texts[i];
    const d = [s.x - f.x, s.y - f.y, s.h - f.h];
    return {
      text: f.text.slice(0, 32),
      figma: `${r2(f.x)}/${r2(f.y)}/${r2(f.h)}`,
      site: `${r2(s.x)}/${r2(s.y)}/${r2(s.h)}`,
      delta: d.map(r2).join("/"),
      ok: d.every((v) => Math.abs(v) <= TOLERANCE),
    };
  });
  const ok = size.ok && rows.every((r) => r.ok);
  if (!ok) failed = true;
  console.log(`${t.bp}/${t.name} — size figma ${size.figma}, site ${size.site} ${size.ok ? "ok" : "FAIL"} — ${ok ? "OK" : "FAIL"}`);
  console.table(rows, ["text", "figma", "site", "delta", "ok"]);
  report.targets.push({ target: `${t.bp}/${t.name}`, node: t.node, ok, size, texts: rows });
}
await browser.close();

await mkdir("test-results/visual", { recursive: true });
await writeFile("test-results/visual/geometry.json", JSON.stringify(report, null, 2));
console.log("x/y/h in px relative to the target; tolerance ±" + TOLERANCE + "px. Report: test-results/visual/geometry.json");
process.exit(failed ? 1 : 0);
