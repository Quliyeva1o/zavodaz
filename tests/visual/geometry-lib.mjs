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
 *
 * `relayout` returns a copy of the tree laid out the same way from each auto-layout frame's own properties:
 *  1. bottom-up, the size of every HUG frame: visible in-flow children + gaps + padding (cross axis: the largest
 *     child, a stretching one with its own size), clamped to minWidth/maxWidth/minHeight/maxHeight;
 *  2. top-down, in every auto-layout frame: STRETCH / FILL children take the inner cross size, layoutGrow / FILL
 *     children share the free main-axis space equally (cross clamped like 1.), then every in-flow child is placed
 *     (padding, gap or SPACE_BETWEEN, MIN/CENTER/MAX alignment); a child's subtree moves with it.
 * Other sizes (FIXED, texts) are kept. On a coherent tree it changes nothing. Anything it does not model throws
 * instead of guessing: WRAP or GRID layout, BASELINE alignment, strokesIncludedInLayout, per-child layoutAlign
 * MIN/CENTER/MAX, a HUG main axis with a FILL child, FILL inside SPACE_BETWEEN, min/max on a FILL main axis, and FILL children without free space. Opt-in per target (`relayout`).
 */
export function relayout(root) {
  const copy = structuredClone(root);
  const isFlow = (c) => c.visible !== false && c.layoutPositioning !== "ABSOLUTE" && c.absoluteBoundingBox;
  const isAuto = (n) => (n.layoutMode === "HORIZONTAL" || n.layoutMode === "VERTICAL") && n.absoluteBoundingBox;
  const fail = (n, why) => {
    throw new Error(`relayout: ${n.id} "${n.name ?? ""}" — ${why}`);
  };
  /** Sizing of `n` along "x" | "y" (inside `parent`): FIXED | HUG | FILL. */
  const sizing = (n, axis, parent) => {
    const v = axis === "x" ? n.layoutSizingHorizontal : n.layoutSizingVertical;
    if (v) return v;
    if (parent && isAuto(parent)) {
      const parentMain = parent.layoutMode === "HORIZONTAL" ? "x" : "y";
      if (axis === parentMain && n.layoutGrow === 1) return "FILL";
      if (axis !== parentMain && n.layoutAlign === "STRETCH") return "FILL";
    }
    if (isAuto(n)) {
      const primary = (n.layoutMode === "HORIZONTAL") === (axis === "x");
      if ((primary ? n.primaryAxisSizingMode : n.counterAxisSizingMode) === "AUTO") return "HUG";
    }
    return "FIXED";
  };
  const clamp = (n, axis, v) => {
    const [lo, hi] = axis === "x" ? [n.minWidth, n.maxWidth] : [n.minHeight, n.maxHeight];
    return Math.min(hi ?? Infinity, Math.max(lo ?? -Infinity, v));
  };
  const dim = (axis) => (axis === "x" ? "width" : "height");
  const pads = (n, axis) => (axis === "x" ? [n.paddingLeft ?? 0, n.paddingRight ?? 0] : [n.paddingTop ?? 0, n.paddingBottom ?? 0]);
  const check = (n) => {
    if (n.layoutMode === "GRID") fail(n, "GRID layout is not supported");
    if (!isAuto(n)) return;
    if (n.layoutWrap === "WRAP") fail(n, "WRAP layout is not supported");
    if (n.counterAxisAlignItems === "BASELINE") fail(n, "BASELINE alignment is not supported");
    if (n.strokesIncludedInLayout) fail(n, "strokesIncludedInLayout is not supported");
    for (const c of (n.children ?? []).filter(isFlow)) {
      if (c.layoutAlign && !["INHERIT", "STRETCH"].includes(c.layoutAlign)) fail(c, `per-child layoutAlign ${c.layoutAlign} is not supported`);
    }
  };

  (function size(n) {
    check(n);
    for (const c of n.children ?? []) size(c);
    if (!isAuto(n)) return;
    const flow = (n.children ?? []).filter(isFlow);
    if (!flow.length) return;
    const main = n.layoutMode === "HORIZONTAL" ? "x" : "y";
    const next = { ...n.absoluteBoundingBox };
    for (const axis of ["x", "y"]) {
      if (sizing(n, axis) !== "HUG") continue;
      const fills = flow.filter((c) => sizing(c, axis, n) === "FILL");
      const [a, b] = pads(n, axis);
      if (axis === main) {
        if (fills.length) fail(n, "HUG main axis with a FILL child");
        if (n.primaryAxisAlignItems === "SPACE_BETWEEN") continue;
        const sum = flow.reduce((s, c) => s + c.absoluteBoundingBox[dim(axis)], 0);
        next[dim(axis)] = clamp(n, axis, sum + (n.itemSpacing ?? 0) * (flow.length - 1) + a + b);
      } else {
        // A stretching child still counts with its own (content) size, as in Figma: a FILL text in a HUG row.
        next[dim(axis)] = clamp(n, axis, Math.max(...flow.map((c) => c.absoluteBoundingBox[dim(axis)])) + a + b);
      }
    }
    n.absoluteBoundingBox = next;
  })(copy);

  (function place(n) {
    const kids = n.children ?? [];
    if (isAuto(n)) {
      const main = n.layoutMode === "HORIZONTAL" ? "x" : "y";
      const cross = main === "x" ? "y" : "x";
      const b = n.absoluteBoundingBox;
      const [start, end] = pads(n, main);
      const [cStart, cEnd] = pads(n, cross);
      const inner = b[dim(main)] - start - end;
      const innerCross = b[dim(cross)] - cStart - cEnd;
      const flow = kids.filter(isFlow);
      const resize = (c, axis, v) => {
        const d = dim(axis);
        if (Math.abs(c.absoluteBoundingBox[d] - v) > 1e-6) c.absoluteBoundingBox = { ...c.absoluteBoundingBox, [d]: v };
      };
      for (const c of flow) if (sizing(c, cross, n) === "FILL") resize(c, cross, clamp(c, cross, innerCross));
      const grow = flow.filter((c) => sizing(c, main, n) === "FILL");
      if (grow.length) {
        if (n.primaryAxisAlignItems === "SPACE_BETWEEN") fail(n, "FILL child inside SPACE_BETWEEN");
        const rigid = flow.filter((c) => !grow.includes(c)).reduce((s, c) => s + c.absoluteBoundingBox[dim(main)], 0);
        const free = inner - rigid - (n.itemSpacing ?? 0) * (flow.length - 1);
        if (free < 0) fail(n, "FILL children have no free space");
        for (const c of grow) {
          const [lo, hi] = main === "x" ? [c.minWidth, c.maxWidth] : [c.minHeight, c.maxHeight];
          if (lo !== undefined || hi !== undefined) fail(c, "min/max size on a FILL main axis is not supported");
          resize(c, main, free / grow.length);
        }
      }
      const sum = flow.reduce((s, c) => s + c.absoluteBoundingBox[dim(main)], 0);
      const between = n.primaryAxisAlignItems === "SPACE_BETWEEN" && flow.length > 1;
      const gap = between ? (inner - sum) / (flow.length - 1) : (n.itemSpacing ?? 0);
      const total = sum + gap * Math.max(0, flow.length - 1);
      const align = n.primaryAxisAlignItems ?? "MIN";
      let at = start + (align === "CENTER" ? (inner - total) / 2 : align === "MAX" ? inner - total : 0);
      const crossAlign = n.counterAxisAlignItems ?? "MIN";
      for (const c of flow) {
        const cb = c.absoluteBoundingBox;
        const free = innerCross - cb[dim(cross)];
        const off = cStart + (crossAlign === "CENTER" ? free / 2 : crossAlign === "MAX" ? free : 0);
        const want = { [main]: b[main] + at, [cross]: b[cross] + off };
        const dx = want.x - cb.x;
        const dy = want.y - cb.y;
        if (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6) shift(c, dx, dy);
        at += cb[dim(main)] + gap;
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
