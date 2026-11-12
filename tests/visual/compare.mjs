// Visual guard (spec 1.1 item 6b): compares site screenshots with Figma exports. Fails (exit 1)
// when a size differs or more than 2.5% of the pixels differ. Exact placement is checked by
// geometry.mjs (6a); this catches wrong colours, icons, spacing and missing elements, not font
// rasterisation (Chrome on Windows vs Figma). Red diff images: test-results/visual/diff/<bp>-<name>.png
import { mkdir, readFile, writeFile } from "node:fs/promises";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const MAX_DIFF_PERCENT = 2.5; // spec 1.1 item 6b

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
const targets = JSON.parse(await readFile("tests/visual/targets.json", "utf8"));
const rows = [];
let failed = false;

for (const t of targets) {
  const figma = onWhite(PNG.sync.read(await readFile(`design/reference/${t.bp}/${t.name}.png`)));
  const site = onWhite(PNG.sync.read(await readFile(`test-results/visual/${t.bp}/${t.name}.png`)));
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
  const ok = raw <= MAX_DIFF_PERCENT;
  if (!ok) failed = true;
  rows.push({ ...row, diff: `${percent}%`, ok });
}

console.table(rows);
process.exit(failed ? 1 : 0);
