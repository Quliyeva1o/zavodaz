// Prints a Figma node tree with exact layout values: position relative to the root, size,
// auto-layout (gap, padding, alignment), radius, fills, strokes, effects and text styles.
//   npm run figma:inspect -- 143:1693 [depth=6]
import { findNode, getNodes, loadCachedFile, type FigmaColor, type FigmaNode } from "./api.mts";

const [id, depthArg] = process.argv.slice(2);
if (!id) throw new Error("Usage: npm run figma:inspect -- <node-id> [depth]");
const maxDepth = Number(depthArg ?? 6);

const hex = (c: FigmaColor, opacity = 1) => {
  const h = "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
  const a = c.a * opacity;
  return a < 1 ? `${h}@${a.toFixed(2)}` : h;
};

function line(n: FigmaNode, depth: number, ox: number, oy: number): string {
  const b = n.absoluteBoundingBox;
  const at = b ? `[${Math.round(b.x - ox)},${Math.round(b.y - oy)} ${Math.round(b.width)}x${Math.round(b.height)}]` : "";
  const parts = [`${"  ".repeat(depth)}${n.type} "${n.name}" ${n.id} ${at}`];
  if (n.visible === false) parts.push("HIDDEN");
  const al = n as Record<string, unknown>;
  if (al.layoutMode && al.layoutMode !== "NONE") {
    const pad = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"].map((k) => al[k] ?? 0).join("/");
    parts.push(`auto:${al.layoutMode} gap=${al.itemSpacing ?? 0} pad=${pad} main=${al.primaryAxisAlignItems ?? "MIN"} cross=${al.counterAxisAlignItems ?? "MIN"}`);
  }
  if (al.cornerRadius) parts.push(`r=${al.cornerRadius}`);
  if (al.rectangleCornerRadii) parts.push(`r=${al.rectangleCornerRadii}`);
  const fills = (n.fills ?? []).filter((f) => f.visible !== false);
  if (fills.length) parts.push("fill=" + fills.map((f) => (f.color ? hex(f.color, f.opacity) : f.type)).join(","));
  const strokes = ((al.strokes as FigmaNode["fills"]) ?? []).filter((f) => f.visible !== false);
  if (strokes.length) parts.push(`stroke=${strokes.map((s) => (s.color ? hex(s.color) : s.type)).join(",")}/${al.strokeWeight}${al.individualStrokeWeights ? JSON.stringify(al.individualStrokeWeights) : ""} ${al.strokeAlign ?? ""}`);
  const effects = ((al.effects as { type: string; visible?: boolean; offset?: { x: number; y: number }; radius: number; spread?: number; color?: FigmaColor }[]) ?? []).filter((e) => e.visible !== false);
  if (effects.length) parts.push("fx=" + effects.map((e) => `${e.type}(${e.offset?.x ?? 0},${e.offset?.y ?? 0},${e.radius},${e.spread ?? 0},${e.color ? hex(e.color) : ""})`).join(","));
  if (n.type === "TEXT" && n.style) {
    const s = n.style;
    parts.push(`"${(n.characters ?? "").slice(0, 50)}" ${s.fontWeight} ${s.fontSize}/${Math.round(s.lineHeightPx * 100) / 100} ls=${Math.round(s.letterSpacing * 1000) / 1000}${s.textCase ? " " + s.textCase : ""}`);
  }
  return parts.join(" ");
}

let root: FigmaNode;
try {
  root = (await getNodes([id]))[id].document;
  console.log("source: Figma API");
} catch (err) {
  console.warn(`Figma API failed: ${(err as Error).message.split("\n")[0].slice(0, 120)}`);
  const file = await loadCachedFile();
  const hit = findNode(file.document, id);
  if (!hit) throw new Error(`Node ${id} not found in the local copy`);
  root = hit;
  console.log(`source: local copy ${file.lastModified}`);
}
const box = root.absoluteBoundingBox ?? { x: 0, y: 0 };
const out: string[] = [];
(function visit(n: FigmaNode, depth: number) {
  if (n.type === "VECTOR" || n.type === "BOOLEAN_OPERATION") return;
  out.push(line(n, depth, box.x, box.y));
  if (depth < maxDepth) for (const c of n.children ?? []) visit(c, depth + 1);
})(root, 0);
console.log(out.join("\n"));
