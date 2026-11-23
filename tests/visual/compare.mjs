// Visual guard (spec 1.1 item 6b): compares site screenshots with Figma exports. Fails (exit 1)
// when a size differs or more than 2.5% of the pixels differ. Exact placement is checked by
// geometry.mjs (6a); this catches wrong colours, icons, spacing and missing elements, not font
// rasterisation (Chrome on Windows vs Figma). Red diff images: test-results/visual/diff/<bp>-<name>.png
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { cropHeight, cropImage, cropImageTop, refOffset, loadTargets } from "./target-lib.mjs";

const MAX_DIFF_PERCENT = 2.5; // spec 1.1 item 6b
const MAX_EXCEPTION_PERCENT = 7; // ceiling for a per-target maxDiff (spec 1.1 item 6b)

/** Composites the image onto white, as it is seen on the page (Figma leaves the rounded-up
 * last row of a fractional-height frame transparent; pixelmatch would count it as different). */
function onWhite(png) {
  const d = png.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255;
    for (let c = 0; c < 3; c++) d[i + c] = Math.round(d[i + c] * a + 255 * (1 - a));
    d[i + 3] = 255;
  }
  return png;
}
const targets = loadTargets(JSON.parse(await readFile("tests/visual/targets.json", "utf8")), process.env.VISUAL_ONLY);
const rows = [];
const pending = [];
let failed = false;
const exists = (f) => access(f).then(() => true, () => false);

// Per-target exception (approved 2026-11-16) only for dense text or a deliberate content
// difference; it must state why and stays at the measured value + ~0.5, never above 7%.
for (const t of targets) {
  if (t.maxDiff === undefined) continue;
  if (!t.maxDiffReason) throw new Error(`${t.bp}/${t.name}: maxDiff requires maxDiffReason`);
  if (!(typeof t.maxDiff === "number" && t.maxDiff > 0 && t.maxDiff <= MAX_EXCEPTION_PERCENT)) {
    throw new Error(`${t.bp}/${t.name}: maxDiff must be a number in (0, ${MAX_EXCEPTION_PERCENT}], got ${t.maxDiff}`);
  }
}

for (const t of targets) {
  const ref = `design/reference/${t.bp}/${t.name}.png`;
  if (!(await exists(ref))) {
    // Strict: a target without its Figma export is not verified → the run fails, after listing what is missing.
    pending.push({ target: `${t.bp}/${t.name}`, node: t.node, missing: ref });
    failed = true;
    continue;
  }
  const site = onWhite(PNG.sync.read(await readFile(`test-results/visual/${t.bp}/${t.name}.png`)));
  // refOffset: the node's box inside a larger export (overflowing effects) → that region, at the site's size;
  // crop: the reference is the whole Figma node, only its top `crop` rows are compared (the capture is already cropped).
  const full = onWhite(PNG.sync.read(await readFile(ref)));
  const at = refOffset(t.refOffset);
  const figma = t.refOffset ? cropImage(full, { ...at, width: site.width, height: cropHeight(t.crop) ?? site.height }) : cropImageTop(full, cropHeight(t.crop));
  const row = { target: `${t.bp}/${t.name}`, figma: `${figma.width}x${figma.height}`, site: `${site.width}x${site.height}` };
  if (figma.width !== site.width || figma.height !== site.height) {
    rows.push({ ...row, diff: "SIZE", ok: false });
    failed = true;
    continue;
  }
  const diff = new PNG({ width: figma.width, height: figma.height });
  // includeAA: false — anti-aliased text edges (Figma vs Chrome rasteriser) are not counted.
  const n = pixelmatch(figma.data, site.data, diff.data, figma.width, figma.height, { threshold: 0.1, includeAA: false });
  const raw = (n / (figma.width * figma.height)) * 100;
  const percent = +raw.toFixed(2);
  await mkdir("test-results/visual/diff", { recursive: true });
  await writeFile(`test-results/visual/diff/${t.bp}-${t.name}.png`, PNG.sync.write(diff));
  const limit = t.maxDiff ?? MAX_DIFF_PERCENT;
  const ok = raw <= limit;
  if (!ok) failed = true;
  rows.push({ ...row, diff: `${percent}%`, limit: `${limit}%`, ok });
}

console.table(rows);
if (pending.length) {
  console.log(`PENDING (no reference) — ${pending.length} target(s) not compared; export the node at 1x to the path:`);
  console.table(pending);
}
process.exit(failed ? 1 : 0);
