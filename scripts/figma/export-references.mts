// Exports targets in tests/visual/targets.json from Figma at 1x → design/reference/<bp>/<name>.png
//   npm run figma:references                every target (overwrites existing references)
//   npm run figma:references -- --missing   only targets without a reference yet (keeps the approved ones)
import { access, readFile } from "node:fs/promises";
import { download, exportImages } from "./api.mts";

type Target = { name: string; bp: string; node: string };
const all = JSON.parse(await readFile("tests/visual/targets.json", "utf8")) as Target[];
const file = (t: Target) => `design/reference/${t.bp}/${t.name}.png`;
const exists = (f: string) => access(f).then(() => true, () => false);
const targets = process.argv.includes("--missing") ? (await Promise.all(all.map(async (t) => ((await exists(file(t))) ? null : t)))).filter((t): t is Target => t !== null) : all;
if (!targets.length) {
  console.log("Nothing to export");
  process.exit(0);
}
const urls = await exportImages([...new Set(targets.map((t) => t.node))], { format: "png", scale: 1 });
for (const t of targets) {
  await download(urls[t.node], file(t));
  console.log(file(t));
}
