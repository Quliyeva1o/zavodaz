import { z } from "zod";
import { SAFE_HREF } from "./safe-href";
import type { RichDoc, RichMark, RichNode } from "./types";

/** Strict allow-list of what `src/lib/rich-text.tsx` renders. Anything else is rejected, unknown attrs are dropped. */
export const MAX_DOC_DEPTH = 8;
export const MAX_DOC_NODES = 5000;

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

/** Why a document was rejected — the save action turns it into a message for the admin. */
export type RichDocProblem = "link" | "heading" | "depth" | "size" | "invalid";

type Budget = { nodes: number; reason?: RichDocProblem };

/** Records the first (innermost) reason and rejects the node. */
const fail = (budget: Budget, reason: RichDocProblem): null => {
  budget.reason ??= reason;
  return null;
};

const hasUnsafeLink = (value: Record<string, unknown>) =>
  Array.isArray(value.marks) &&
  value.marks.some(
    (m) => isObject(m) && m.type === "link" && !(isObject(m.attrs) && typeof m.attrs.href === "string" && SAFE_HREF.test(m.attrs.href)),
  );

/** Returns the cleaned node or null when invalid. `depth` of the doc itself is 0. */
function cleanNode(value: unknown, parent: "doc" | "item" | "block", depth: number, budget: Budget): RichNode | null {
  if (!isObject(value)) return fail(budget, "invalid");
  if (depth > MAX_DOC_DEPTH) return fail(budget, "depth");
  if (++budget.nodes > MAX_DOC_NODES) return fail(budget, "size");
  const type = value.type;

  const children = (allowed: (t: unknown) => boolean, ctx: "item" | "block", min = 0): RichNode[] | null => {
    const raw = value.content;
    if (raw === undefined) return min === 0 ? [] : fail(budget, "invalid");
    if (!Array.isArray(raw) || raw.length < min) return fail(budget, "invalid");
    const out: RichNode[] = [];
    for (const child of raw) {
      if (!isObject(child) || !allowed(child.type)) return fail(budget, isObject(child) && child.type === "heading" ? "heading" : "invalid");
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
      if (parent !== "doc") return fail(budget, "heading");
      const level = isObject(value.attrs) ? value.attrs.level : undefined;
      if (level !== 2 && level !== 3) return fail(budget, "invalid");
      const content = children(inline, "block");
      return content && withContent({ type: "heading", attrs: { level } }, content);
    }
    case "bulletList":
    case "orderedList": {
      if (parent !== "doc" && parent !== "item") return fail(budget, "invalid");
      const content = children((t) => t === "listItem", "item", 1);
      return content && { type, content };
    }
    case "listItem": {
      if (parent !== "item") return fail(budget, "invalid");
      const content = children((t) => t === "paragraph" || t === "bulletList" || t === "orderedList", "item", 1);
      return content && { type: "listItem", content };
    }
    case "text": {
      const parsed = textSchema.safeParse(value);
      return parsed.success ? parsed.data : fail(budget, hasUnsafeLink(value) ? "link" : "invalid");
    }
    case "hardBreak":
      return { type: "hardBreak" };
    default:
      return fail(budget, "invalid");
  }
}

/**
 * Validates and cleans a Tiptap document: the cleaned doc, or why it was rejected.
 * An empty doc is valid.
 */
export function checkRichDoc(value: unknown): { ok: true; doc: RichDoc } | { ok: false; reason: RichDocProblem } {
  const invalid = { ok: false, reason: "invalid" } as const;
  if (!isObject(value) || value.type !== "doc") return invalid;
  const raw = value.content;
  if (raw === undefined) return { ok: true, doc: { type: "doc" } };
  if (!Array.isArray(raw)) return invalid;
  const budget: Budget = { nodes: 0 };
  const content: RichNode[] = [];
  for (const child of raw) {
    if (!isObject(child) || !["paragraph", "heading", "bulletList", "orderedList"].includes(String(child.type))) return invalid;
    const cleaned = cleanNode(child, "doc", 1, budget);
    if (!cleaned) return { ok: false, reason: budget.reason ?? "invalid" };
    content.push(cleaned);
  }
  return { ok: true, doc: content.length ? { type: "doc", content } : { type: "doc" } };
}

/** Cleaned doc, or `null` when the value is invalid (see checkRichDoc). */
export function parseRichDoc(value: unknown): RichDoc | null {
  const r = checkRichDoc(value);
  return r.ok ? r.doc : null;
}

/** Admin-facing explanation of a rejected document. */
export const richDocProblemMessage: Record<RichDocProblem, string> = {
  link: "Link yalnız https://, http:// və ya mailto: ilə başlaya bilər",
  heading: "Başlıq siyahının içində ola bilməz",
  depth: "Siyahılar həddən çox iç-içədir (ən çox 3 səviyyə)",
  size: "Məzmun çox böyükdür",
  invalid: "Məzmunda dəstəklənməyən element var (icazə verilənlər: başlıq, qalın, kursiv, siyahı, link)",
};
