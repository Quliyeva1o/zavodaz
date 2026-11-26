// Exports targets in tests/visual/targets.json from Figma at 1x → design/reference/<bp>/<name>.png
//   npm run figma:references                every target (overwrites existing references)
//   npm run figma:references -- --missing   only targets without a reference yet (keeps the approved ones)
//   npm run figma:references -- --missing --from-frames
//       offline (Figma /images API rate-limited): cuts each target out of its top frame's 1x PNG,
//       design/.cache/figma-frames/<frame-id with ":" → "-">.png (exported from the Figma UI), using the node boxes
//       of the local file copy (design/.cache/file.json). A `union` target is cut as the common box of its nodes.
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { PNG } from "pngjs";
import { download, exportImages, loadCachedFile, type FigmaNode } from "./api.mts";
import { cropRegion, referenceRect, targetNodes, unionBox } from "../../tests/visual/target-lib.mjs";

type Target = { name: string; bp: string; node: string; union?: string[] };
const all = JSON.parse(await readFile("tests/visual/targets.json", "utf8")) as Target[];
const file = (t: Target) => `design/reference/${t.bp}/${t.name}.png`;
const exists = (f: string) => access(f).then(() => true, () => false);
const targets = process.argv.includes("--missing") ? (await Promise.all(all.map(async (t) => ((await exists(file(t))) ? null : t)))).filter((t): t is Target => t !== null) : all;
if (!targets.length) {
  console.log("Nothing to export");
  process.exit(0);
}

if (process.argv.includes("--from-frames")) {
  const doc = (await loadCachedFile()).document;
  // node id → { node, its top frame }
  const index = new Map<string, { node: FigmaNode; frame: FigmaNode }>();
  // Top frames are the children of a page or of a SECTION (sections only group frames on the canvas).
  const topLevel = (n: FigmaNode) => {
    if (n.type === "SECTION") {
      for (const c of n.children ?? []) topLevel(c);
      return;
    }
    (function visit(m: FigmaNode) {
      index.set(m.id, { node: m, frame: n });
      for (const c of m.children ?? []) visit(c);
    })(n);
  };
  for (const page of doc.children ?? []) for (const c of page.children ?? []) topLevel(c);
  const frames = new Map<string, PNG | null>();
  const loadFrame = async (id: string) => {
    if (!frames.has(id)) {
      const path = `design/.cache/figma-frames/${id.replace(/:/g, "-")}.png`;
      frames.set(id, (await exists(path)) ? PNG.sync.read(await readFile(path)) : null);
    }
    return frames.get(id)!;
  };
  let missing = 0;
  for (const t of targets) {
    const hits = targetNodes(t).map((id: string) => index.get(id));
    if (hits.some((h: unknown) => !h)) throw new Error(`${t.bp}/${t.name}: node not in the local copy`);
    const frame = hits[0]!.frame;
    if (hits.some((h: { frame: FigmaNode } | undefined) => h!.frame.id !== frame.id)) throw new Error(`${t.bp}/${t.name}: union nodes are in different frames`);
    const png = await loadFrame(frame.id);
    if (!png) {
      console.log(`WAITING ${t.bp}/${t.name}: frame ${frame.id} PNG not exported yet`);
      missing++;
      continue;
    }
    const fb = frame.absoluteBoundingBox!;
    // The frame PNG is the frame box (clipped), rounded up; a different size means a different export scale or version.
    if (png.width !== Math.ceil(fb.width - 1e-3) || Math.abs(png.height - fb.height) > 1) {
      throw new Error(`frame ${frame.id}: PNG ${png.width}x${png.height}, Figma ${fb.width}x${fb.height} — not a 1x export of this version?`);
    }
    const rect = referenceRect(fb, unionBox(hits.map((h: { node: FigmaNode } | undefined) => h!.node.absoluteBoundingBox!)));
    if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > png.width || rect.y + rect.height > png.height) {
      console.log(`  note ${t.bp}/${t.name}: box ${JSON.stringify(rect)} reaches past the ${png.width}x${png.height} frame — the outside is transparent`);
    }
    const part = cropRegion(png, rect);
    const out = new PNG({ width: part.width, height: part.height });
    part.data.copy(out.data);
    await mkdir(dirname(file(t)), { recursive: true });
    await writeFile(file(t), PNG.sync.write(out));
    console.log(`${file(t)} ← ${frame.id} @${rect.x},${rect.y} ${rect.width}x${rect.height}`);
  }
  process.exit(missing ? 2 : 0);
}

const unions = targets.filter((t) => t.union);
if (unions.length) throw new Error(`union targets (${unions.map((t) => `${t.bp}/${t.name}`).join(", ")}) are cut from frame PNGs: use --from-frames`);
const urls = await exportImages([...new Set(targets.map((t) => t.node))], { format: "png", scale: 1 });
for (const t of targets) {
  await download(urls[t.node], file(t));
  console.log(file(t));
}
