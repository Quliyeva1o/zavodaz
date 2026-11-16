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
