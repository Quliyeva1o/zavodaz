import { z } from "zod";
import type { RichDoc, RichMark, RichNode } from "./types";

/** Strict allow-list of what `src/lib/rich-text.tsx` renders. Anything else is rejected, unknown attrs are dropped. */
export const MAX_DOC_DEPTH = 8;
export const MAX_DOC_NODES = 5000;

const SAFE_HREF = /^(https?:\/\/|mailto:)/i;

const markSchema = z.union([
  z.object({ type: z.literal("bold") }).transform((): RichMark => ({ type: "bold" })),
  z.object({ type: z.literal("italic") }).transform((): RichMark => ({ type: "italic" })),
  z
    .object({ type: z.literal("link"), attrs: z.object({ href: z.string().max(2000).regex(SAFE_HREF) }) })
    .transform((m): RichMark => ({ type: "link", attrs: { href: m.attrs.href } })),
]);

const textSchema = z
  .object({ type: z.literal("text"), text: z.string().max(100_000), marks: z.array(markSchema).max(10).optional() })
  .transform((n): RichNode => (n.marks?.length ? { type: "text", text: n.text, marks: n.marks } : { type: "text", text: n.text }));

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

type Budget = { nodes: number };

/** Returns the cleaned node or null when invalid. `depth` of the doc itself is 0. */
function cleanNode(value: unknown, parent: "doc" | "item" | "block", depth: number, budget: Budget): RichNode | null {
  if (!isObject(value) || depth > MAX_DOC_DEPTH || ++budget.nodes > MAX_DOC_NODES) return null;
  const type = value.type;

  const children = (allowed: (t: unknown) => boolean, ctx: "item" | "block", min = 0): RichNode[] | null => {
    const raw = value.content;
    if (raw === undefined) return min === 0 ? [] : null;
    if (!Array.isArray(raw) || raw.length < min) return null;
    const out: RichNode[] = [];
    for (const child of raw) {
      if (!isObject(child) || !allowed(child.type)) return null;
      const cleaned = cleanNode(child, ctx, depth + 1, budget);
      if (!cleaned) return null;
      out.push(cleaned);
    }
    return out;
  };
  const withContent = (n: RichNode, content: RichNode[]): RichNode => (content.length ? { ...n, content } : n);
  const inline = (t: unknown) => t === "text" || t === "hardBreak";

  switch (type) {
    case "paragraph": {
      const content = children(inline, "block");
      return content && withContent({ type: "paragraph" }, content);
    }
    case "heading": {
      if (parent !== "doc") return null;
      const level = isObject(value.attrs) ? value.attrs.level : undefined;
      if (level !== 2 && level !== 3) return null;
      const content = children(inline, "block");
      return content && withContent({ type: "heading", attrs: { level } }, content);
    }
    case "bulletList":
    case "orderedList": {
      if (parent !== "doc" && parent !== "item") return null;
      const content = children((t) => t === "listItem", "item", 1);
      return content && { type, content };
    }
    case "listItem": {
      if (parent !== "item") return null;
      const content = children((t) => t === "paragraph" || t === "bulletList" || t === "orderedList", "item", 1);
      return content && { type: "listItem", content };
    }
    case "text": {
      const parsed = textSchema.safeParse(value);
      return parsed.success ? parsed.data : null;
    }
    case "hardBreak":
      return { type: "hardBreak" };
    default:
      return null;
  }
}

/**
 * Validates and cleans a Tiptap document. Returns the cleaned doc, or `null` when the value is invalid.
 * An empty doc is valid.
 */
export function parseRichDoc(value: unknown): RichDoc | null {
  if (!isObject(value) || value.type !== "doc") return null;
  const raw = value.content;
  if (raw === undefined) return { type: "doc" };
  if (!Array.isArray(raw)) return null;
  const budget: Budget = { nodes: 0 };
  const content: RichNode[] = [];
  for (const child of raw) {
    if (!isObject(child) || !["paragraph", "heading", "bulletList", "orderedList"].includes(String(child.type))) return null;
    const cleaned = cleanNode(child, "doc", 1, budget);
    if (!cleaned) return null;
    content.push(cleaned);
  }
  return content.length ? { type: "doc", content } : { type: "doc" };
}
