// Compares site screenshots with Figma exports. Fails (exit 1) when a size differs or more
// than 0.5% of the pixels differ. Red diff images: test-results/visual/diff/<bp>-<name>.png
import { mkdir, readFile, writeFile } from "node:fs/promises";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const MAX_DIFF_PERCENT = 0.5;
const targets = JSON.parse(await readFile("tests/visual/targets.json", "utf8"));
const rows = [];
let failed = false;

for (const t of targets) {
  const figma = PNG.sync.read(await readFile(`design/reference/${t.bp}/${t.name}.png`));
  const site = PNG.sync.read(await readFile(`test-results/visual/${t.bp}/${t.name}.png`));
  const row = { target: `${t.bp}/${t.name}`, figma: `${figma.width}x${figma.height}`, site: `${site.width}x${site.height}` };
  if (figma.width !== site.width || figma.height !== site.height) {
    rows.push({ ...row, diff: "SIZE", ok: false });
    failed = true;
    continue;
  }
  const diff = new PNG({ width: figma.width, height: figma.height });
  // includeAA: false — anti-aliased text edges (Figma vs Chrome rasteriser) are not counted.
  const n = pixelmatch(figma.data, site.data, diff.data, figma.width, figma.height, { threshold: 0.1, includeAA: false });
  const percent = +((n / (figma.width * figma.height)) * 100).toFixed(2);
  await mkdir("test-results/visual/diff", { recursive: true });
  await writeFile(`test-results/visual/diff/${t.bp}-${t.name}.png`, PNG.sync.write(diff));
  const ok = percent <= MAX_DIFF_PERCENT;
  if (!ok) failed = true;
  rows.push({ ...row, diff: `${percent}%`, ok });
}

console.table(rows);
process.exit(failed ? 1 : 0);
