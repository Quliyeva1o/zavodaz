// Exports every target in tests/visual/targets.json from Figma at 1x → design/reference/<bp>/<name>.png
import { readFile } from "node:fs/promises";
import { download, exportImages } from "./api.mts";

type Target = { name: string; bp: string; node: string };
const targets = JSON.parse(await readFile("tests/visual/targets.json", "utf8")) as Target[];
const urls = await exportImages([...new Set(targets.map((t) => t.node))], { format: "png", scale: 1 });
for (const t of targets) {
  await download(urls[t.node], `design/reference/${t.bp}/${t.name}.png`);
  console.log(`design/reference/${t.bp}/${t.name}.png`);
}
