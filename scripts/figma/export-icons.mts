// Builds SVG icons from Figma vector geometry (/nodes?geometry=paths) — exact Figma outlines,
// no image-render API needed. Supports what our icons use: frames with a solid fill and
// corner radius (circle backgrounds) and vectors / boolean shapes with solid fills.
//   npm run figma:icons
// Debug: FIGMA_ICONS_SAVE=<file> stores the API response; FIGMA_ICONS_CACHE=<file> re-runs from it.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { FILE_KEY } from "./api.mts";

type Paint = { type: string; visible?: boolean; opacity?: number; color?: { r: number; g: number; b: number; a: number } };
type Geo = { path: string; windingRule: "NONZERO" | "EVENODD" };
type Node = {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  absoluteBoundingBox: { x: number; y: number; width: number; height: number };
  relativeTransform?: [[number, number, number], [number, number, number]];
  fills?: Paint[];
  fillGeometry?: Geo[];
  cornerRadius?: number;
  children?: Node[];
};

export const ICONS: Record<string, string> = {
  "check-circle": "157:2324",
  "caret-up": "I153:4344;153:4307",
  "caret-down-brand": "I153:4349;153:4303",
  asterisk: "157:2317",
  "diamonds-four": "157:2339",
  "crown-simple": "157:2374",
  "phone-24": "153:4629",
  "envelope-simple": "153:4635",
  "social-light-facebook": "560:15595",
  "social-light-instagram": "560:15597",
  "social-light-linkedin": "560:15599",
  "social-light-x": "560:15601",
  "social-light-youtube": "560:15609",
  "social-light-tiktok": "560:15611",
  // Contact form (Task 7). Drawn from the Phosphor outlines while the API was rate-limited;
  // the next `npm run figma:icons` replaces them with the exact Figma geometry.
  "warning-circle": "52:2233",
  notches: "I153:4673;52:2353",
  "x-brand": "244:9727",
  "check-brand": "I52:2337;9:571",
};

const hex = (p: Paint) => {
  const c = p.color!;
  const h = "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
  const a = (p.opacity ?? 1) * c.a;
  return a < 1 ? `${h}" fill-opacity="${+a.toFixed(3)}` : h;
};
const solid = (n: Node) => (n.fills ?? []).find((f) => f.visible !== false && f.type === "SOLID");

const isBoxPath = (d: string, n: Node) => {
  const { width: w, height: h } = n.absoluteBoundingBox;
  return d.replace(/s+/g, "") === `M0 0L${w} 0L${w} ${h}L0 ${h}L0 0Z`.replace(/s+/g, "");
};

/** One <path> per fill geometry, placed by the node's offset inside the icon frame. */
function shapes(n: Node, root: Node): string[] {
  if (n.visible === false) return [];
  const dx = +(n.absoluteBoundingBox.x - root.absoluteBoundingBox.x).toFixed(4);
  const dy = +(n.absoluteBoundingBox.y - root.absoluteBoundingBox.y).toFixed(4);
  const out: string[] = [];
  const fill = solid(n);
  if (n !== root && fill && n.fillGeometry?.length) {
    for (const g of n.fillGeometry) {
      if (isBoxPath(g.path, n)) continue; // full-frame rectangle = clip/mask helper from SVG imports, not artwork
      out.push(`<path transform="translate(${dx} ${dy})" fill-rule="${g.windingRule === "EVENODD" ? "evenodd" : "nonzero"}" fill="${hex(fill)}" d="${g.path}"/>`);
    }
    return out; // vector / boolean: children are already merged into its geometry
  }
  for (const c of n.children ?? []) out.push(...shapes(c, root));
  return out;
}

function toSvg(root: Node): string {
  const { width: w, height: h } = root.absoluteBoundingBox;
  const bg = solid(root);
  const rect = bg ? `<rect width="${w}" height="${h}" rx="${Math.min(root.cornerRadius ?? 0, w / 2, h / 2)}" fill="${hex(bg)}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">${rect}${shapes(root, root).join("")}</svg>\n`;
}

const ids = Object.values(ICONS);
let body: string;
if (process.env.FIGMA_ICONS_CACHE) {
  body = await readFile(process.env.FIGMA_ICONS_CACHE, "utf8");
} else {
  const token = process.env.FIGMA_TOKEN;
  if (!token) throw new Error("FIGMA_TOKEN is not set (.env.local)");
  const res = await fetch(
    `https://api.figma.com/v1/files/${FILE_KEY}/nodes?geometry=paths&ids=${encodeURIComponent(ids.join(","))}`,
    { headers: { "X-Figma-Token": token } },
  );
  if (!res.ok) throw new Error(`Figma /nodes: ${res.status} ${await res.text()}`);
  body = await res.text();
  if (process.env.FIGMA_ICONS_SAVE) await writeFile(process.env.FIGMA_ICONS_SAVE, body);
}
const { nodes } = JSON.parse(body) as { nodes: Record<string, { document: Node } | null> };

await mkdir("public/icons", { recursive: true });
for (const [name, id] of Object.entries(ICONS)) {
  const node = nodes[id]?.document;
  if (!node) throw new Error(`Figma node not found: ${name} (${id}) — update the id with figma:inspect`);
  await writeFile(`public/icons/${name}.svg`, toSvg(node));
  console.log(`public/icons/${name}.svg  ${node.absoluteBoundingBox.width}×${node.absoluteBoundingBox.height}`);
}
