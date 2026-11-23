// Pure helpers of the geometry check (kept free of Figma API/Node-only code so they are unit-testable).

/** The ONE whitespace rule (regex source): space, \n, \t, NBSP, U+2028/U+2029 (Figma soft breaks)... */
export const WS_SOURCE = "[\\s\\u2028\\u2029]+";

/** Collapse all whitespace to single spaces and trim — same form on Figma and site side. */
export function normalizeText(s) {
  return s.replace(new RegExp(WS_SOURCE, "g"), " ").trim();
}

/** A Figma TEXT with a line/paragraph break (\n, U+2028, U+2029) holds several paragraphs → a site container. */
export function isMultiParagraph(raw) {
  return new RegExp("[\n\r\u2028\u2029]").test(raw.trim());
}

/** Text to look for on the site: alias (deliberately different placeholder) or the Figma text. */
export function resolveText(figmaText, aliases = {}) {
  const key = normalizeText(figmaText);
  const alias = Object.hasOwn(aliases, key) ? normalizeText(aliases[key]) : null;
  return { text: alias ?? key, aliased: alias !== null };
}

/**
 * Figma texts the site draws without a DOM text node (input placeholders live in ::placeholder, R11):
 * `ignore` is a list of Figma texts; matched after whitespace normalisation. Every ignore needs `ignoreReason`.
 */
export function isIgnored(figmaText, ignore = []) {
  const key = normalizeText(figmaText);
  return ignore.some((t) => normalizeText(t) === key);
}

/**
 * Index of the site text box for a Figma text: among the not yet used site texts with the wanted text,
 * the nearest one (|Δx| + |Δy|). Figma tree order and DOM order differ when the layout reorders blocks
 * (e.g. Əlaqə: "E-mail" in the info column and in the form). -1 when none.
 */
export function pickMatch(f, siteTexts, used, want) {
  let best = -1;
  let bestD = Infinity;
  siteTexts.forEach((q, k) => {
    if (used.has(k) || q.text !== want) return;
    const d = Math.abs(q.x - f.x) + Math.abs(q.y - f.y);
    if (d < bestD) [best, bestD] = [k, d];
  });
  return best;
}

/** Error text when the target has fewer Figma texts than `minTexts` (default 1); else null. */
export function minTextsError(count, minTexts) {
  const min = minTexts ?? 1;
  return count < min ? `expected ≥ ${min} Figma texts, got ${count} — wrong node id?` : null;
}

/**
 * Runs INSIDE the page (page.evaluate) — must stay self-contained, no outer references.
 * args: [selector, wanted (already normalised), WS_SOURCE]. For every wanted text: the deepest
 * visible element inside the root whose whitespace-collapsed innerText equals it; box relative
 * to the root. Texts without a match are absent from the result.
 */
export function findBlocks([selector, wanted, wsSource]) {
  const root = document.querySelector(selector);
  const o = root.getBoundingClientRect();
  const ws = new RegExp(wsSource, "g");
  const norm = (s) => s.replace(ws, " ").trim();
  const out = {};
  for (const text of wanted) {
    let best = null;
    for (const el of root.querySelectorAll("*")) {
      if (!el.checkVisibility() || norm(el.innerText) !== text) continue;
      if (!best || best.contains(el)) best = el;
    }
    if (best) {
      const b = best.getBoundingClientRect();
      out[text] = { x: b.left - o.left, y: b.top - o.top, h: b.height };
    }
  }
  return out;
}

/**
 * Figma's stored layout of an instance's children can be stale after a component change (seen in the
 * 2026-11-11 copy: a Dropdown instance HUGs 40px around its box, yet the box sits 27px lower where the now
 * hidden label used to be; Mob/Filtr option texts keep the old 12/10 item padding the instance no longer has).
 * Figma's own render lays the instance out again (the mobile Əlaqə "Müraciət et" button: stored text x 26,
 * rendered centred at ~118 — the reference PNG).
 * `relayout` returns a copy of the tree laid out the same way from each auto-layout frame's own properties:
 * first the size of every HUG frame (bottom-up: visible in-flow children + gaps + padding), then the position
 * of every in-flow child (top-down: padding, gap, alignment); each child's subtree moves with it, other sizes
 * (FIXED, FILL, texts) are kept. On a coherent tree it changes nothing. Opt-in per target (`relayout`).
 */
export function relayout(root) {
  const copy = structuredClone(root);
  const isFlow = (c) => c.visible !== false && c.layoutPositioning !== "ABSOLUTE" && c.absoluteBoundingBox;
  const auto = (n) => (n.layoutMode === "HORIZONTAL" || n.layoutMode === "VERTICAL") && n.layoutWrap !== "WRAP" && n.absoluteBoundingBox;
  const hug = (n, axis) => {
    const v = axis === "x" ? n.layoutSizingHorizontal : n.layoutSizingVertical;
    if (v) return v === "HUG";
    const primary = (n.layoutMode === "HORIZONTAL") === (axis === "x");
    return (primary ? n.primaryAxisSizingMode : n.counterAxisSizingMode) === "AUTO";
  };
  (function size(n) {
    for (const c of n.children ?? []) size(c);
    if (!auto(n)) return;
    const flow = (n.children ?? []).filter(isFlow);
    if (!flow.length) return;
    const h = n.layoutMode === "HORIZONTAL";
    const b = n.absoluteBoundingBox;
    const w = (c) => c.absoluteBoundingBox.width;
    const ht = (c) => c.absoluteBoundingBox.height;
    const gaps = (n.itemSpacing ?? 0) * (flow.length - 1);
    const padX = (n.paddingLeft ?? 0) + (n.paddingRight ?? 0);
    const padY = (n.paddingTop ?? 0) + (n.paddingBottom ?? 0);
    const sumW = flow.reduce((s, c) => s + w(c), 0);
    const sumH = flow.reduce((s, c) => s + ht(c), 0);
    const maxW = Math.max(...flow.map(w));
    const maxH = Math.max(...flow.map(ht));
    const next = { ...b };
    if (hug(n, "x") && n.primaryAxisAlignItems !== "SPACE_BETWEEN") next.width = (h ? sumW + gaps : maxW) + padX;
    if (hug(n, "y")) next.height = (h ? maxH : sumH + gaps) + padY;
    n.absoluteBoundingBox = next;
  })(copy);
  (function place(n) {
    const kids = n.children ?? [];
    const mode = n.layoutMode;
    if ((mode === "HORIZONTAL" || mode === "VERTICAL") && n.layoutWrap !== "WRAP" && n.absoluteBoundingBox) {
      const h = mode === "HORIZONTAL";
      const b = n.absoluteBoundingBox;
      const [start, end, cStart, cEnd] = h
        ? [n.paddingLeft ?? 0, n.paddingRight ?? 0, n.paddingTop ?? 0, n.paddingBottom ?? 0]
        : [n.paddingTop ?? 0, n.paddingBottom ?? 0, n.paddingLeft ?? 0, n.paddingRight ?? 0];
      const size = (c) => (h ? c.absoluteBoundingBox.width : c.absoluteBoundingBox.height);
      const cross = (c) => (h ? c.absoluteBoundingBox.height : c.absoluteBoundingBox.width);
      const flow = kids.filter((c) => c.visible !== false && c.layoutPositioning !== "ABSOLUTE" && c.absoluteBoundingBox);
      const inner = (h ? b.width : b.height) - start - end;
      const innerCross = (h ? b.height : b.width) - cStart - cEnd;
      const sum = flow.reduce((s, c) => s + size(c), 0);
      const between = n.primaryAxisAlignItems === "SPACE_BETWEEN" && flow.length > 1;
      const gap = between ? (inner - sum) / (flow.length - 1) : (n.itemSpacing ?? 0);
      const total = sum + gap * Math.max(0, flow.length - 1);
      const align = n.primaryAxisAlignItems ?? "MIN";
      let at = start + (align === "CENTER" ? (inner - total) / 2 : align === "MAX" ? inner - total : 0);
      const crossAlign = n.counterAxisAlignItems ?? "MIN";
      for (const c of flow) {
        const off = cStart + (crossAlign === "CENTER" ? (innerCross - cross(c)) / 2 : crossAlign === "MAX" ? innerCross - cross(c) : 0);
        if (crossAlign !== "BASELINE") {
          const cb = c.absoluteBoundingBox;
          const dx = (h ? b.x + at : b.x + off) - cb.x;
          const dy = (h ? b.y + off : b.y + at) - cb.y;
          if (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6) shift(c, dx, dy);
        }
        at += size(c) + gap;
      }
    }
    for (const c of kids) place(c);
  })(copy);
  return copy;
}

function shift(n, dx, dy) {
  for (const k of ["absoluteBoundingBox", "absoluteRenderBounds"]) {
    if (n[k]) n[k] = { ...n[k], x: n[k].x + dx, y: n[k].y + dy };
  }
  for (const c of n.children ?? []) shift(c, dx, dy);
}
