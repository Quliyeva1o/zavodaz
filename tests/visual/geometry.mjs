// Geometry check (spec 1.1 item 6a): every visible Figma text node must sit at the same place
// (x, y relative to the target) with the same box height on the site, ±1px; the target itself
// must have the Figma size (rounded up like the reference PNG export).
// Usage: npm run visual:geometry   (production server on E2E_BASE_URL, default http://localhost:3100)
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { findNode, getNodes } from "../../scripts/figma/api.mts";
import { cropHeight, cropSizeError, runOpen, loadTargets, textsInCrop } from "./target-lib.mjs";
import { WS_SOURCE, relayout, findBlocks, isIgnored, isMultiParagraph, minTextsError, normalizeText, pickMatch, resolveText } from "./geometry-lib.mjs";

const TOLERANCE = 1;
const base = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 320, height: 568 } };
const targets = loadTargets(JSON.parse(await readFile("tests/visual/targets.json", "utf8")), process.env.VISUAL_ONLY);

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
      out.push({ raw: n.characters, text: normalizeText(n.characters), x: b.x - o.x, y: b.y - o.y, h: b.height });
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
function siteTexts([selector, wsSource]) {
  const ws = new RegExp(wsSource, "g");
  const root = document.querySelector(selector);
  const o = root.getBoundingClientRect();
  const out = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.data.replace(ws, " ").trim();
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
  // relayout: Figma's stored boxes of instance children can be stale; its render lays them out again (geometry-lib).
  const root = t.relayout ? relayout(figma[t.node]) : figma[t.node];
  const fb = root.absoluteBoundingBox;
  const page = await browser.newPage({ viewport: VIEWPORTS[t.bp], deviceScaleFactor: 1 });
  await page.goto(base + t.path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await runOpen(page, t.open);
  if (t.waitFor) await page.locator(t.waitFor).first().waitFor({ state: "visible" });
  await page.locator(t.selector).first().waitFor({ state: "visible" });
  const site = await page.evaluate(siteTexts, [t.selector, WS_SOURCE]);
  const crop = cropHeight(t.crop);
  const allTexts = textsInCrop(figmaTexts(root), crop);
  const fTexts = allTexts.filter((f) => !isIgnored(f.raw, t.ignore));
  const ignored = allTexts.length - fTexts.length;
  const aliases = t.aliases ?? {};
  const multi = fTexts.filter((f) => isMultiParagraph(f.raw)).map((f) => resolveText(f.raw, aliases).text);
  const blocks = multi.length ? await page.evaluate(findBlocks, [t.selector, multi, WS_SOURCE]) : {};
  await page.close();

  // crop: both sides are compared at the crop height, but each must really be at least that high (and says how high it is).
  const figmaH = figmaPx(fb.height);
  const siteH = sitePx(site.top, site.height);
  const size = {
    figma: `${figmaPx(fb.width)}x${crop ?? figmaH}`,
    site: `${sitePx(site.left, site.width)}x${crop ?? siteH}`,
  };
  if (crop !== null) {
    size.cropOf = { figma: figmaH, site: siteH };
    size.cropError = cropSizeError(crop, siteH) ?? (cropSizeError(crop, figmaH) && `Figma node is ${figmaH}px high, shorter than crop ${crop}px`);
  }
  size.ok = size.figma === size.site && !size.cropError;

  const used = new Set();
  const rows = fTexts.map((f) => {
    const { text: want, aliased } = resolveText(f.raw, aliases);
    const label = (aliased ? "(alias) " : "") + f.text.slice(0, 32);
    let s;
    if (isMultiParagraph(f.raw)) {
      s = blocks[want];
    } else {
      const i = pickMatch(f, site.texts, used, want);
      if (i >= 0) used.add(i);
      s = site.texts[i];
    }
    if (!s) return { text: label, figma: `${r2(f.x)}/${r2(f.y)}/${r2(f.h)}`, site: "—", delta: "unmatched", ok: false };
    const d = [s.x - f.x, s.y - f.y, s.h - f.h];
    return {
      text: label,
      figma: `${r2(f.x)}/${r2(f.y)}/${r2(f.h)}`,
      site: `${r2(s.x)}/${r2(s.y)}/${r2(s.h)}`,
      delta: d.map(r2).join("/"),
      ok: d.every((v) => Math.abs(v) <= TOLERANCE),
    };
  });
  const maxDelta = Math.max(0, ...rows.filter((r) => r.delta !== "unmatched").flatMap((r) => r.delta.split("/").map((v) => Math.abs(+v))));
  const countError = minTextsError(fTexts.length, t.minTexts);
  const ok = size.ok && !countError && rows.every((r) => r.ok);
  if (!ok) failed = true;
  const cropNote = size.cropOf ? ` (crop ${crop} of figma ${size.cropOf.figma}, site ${size.cropOf.site})` : "";
  console.log(`${t.bp}/${t.name} — size figma ${size.figma}, site ${size.site}${cropNote} ${size.ok ? "ok" : "FAIL"}, max |Δ| ${r2(maxDelta)}px — ${ok ? "OK" : "FAIL"}`);
  if (countError) console.log(`  FAIL: ${countError}`);
  if (size.cropError) console.log(`  FAIL: ${size.cropError}`);
  if (t.crop !== undefined) console.log(`  crop (${t.cropReason})`);
  if (t.relayout) console.log(`  relayout (${t.relayoutReason})`);
  for (const [from, to] of Object.entries(aliases)) console.log(`  alias: "${from}" -> "${to}"${t.aliasReason ? ` (${t.aliasReason})` : ""}`);
  if (ignored) console.log(`  ignored ${ignored} Figma text(s): ${t.ignore.map((s) => `"${s}"`).join(", ")}${t.ignoreReason ? ` (${t.ignoreReason})` : ""}`);
  console.table(rows, ["text", "figma", "site", "delta", "ok"]);
  report.targets.push({ target: `${t.bp}/${t.name}`, node: t.node, ok, size, maxDelta, countError, aliases, ignored: t.ignore ?? [], texts: rows });
}
await browser.close();

await mkdir("test-results/visual", { recursive: true });
await writeFile("test-results/visual/geometry.json", JSON.stringify(report, null, 2));
console.log("x/y/h in px relative to the target; tolerance ±" + TOLERANCE + "px. Report: test-results/visual/geometry.json");
process.exit(failed ? 1 : 0);
