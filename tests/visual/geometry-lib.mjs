// Pure helpers of the geometry check (kept free of Playwright/Figma so they are unit-testable).

/** Collapse all whitespace to single spaces and trim — same form on Figma and site side. */
export function normalizeText(s) {
  return s.replace(/\s+/g, " ").trim();
}

/** A Figma TEXT with a line break holds several paragraphs (legal texts) → a site container. */
export function isMultiParagraph(raw) {
  return raw.trim().includes("\n");
}

/** Text to look for on the site: alias (deliberately different placeholder) or the Figma text. */
export function resolveText(figmaText, aliases = {}) {
  const key = normalizeText(figmaText);
  const alias = Object.hasOwn(aliases, key) ? normalizeText(aliases[key]) : null;
  return { text: alias ?? key, aliased: alias !== null };
}

/** Error text when the target has fewer Figma texts than `minTexts` (default 1); else null. */
export function minTextsError(count, minTexts) {
  const min = minTexts ?? 1;
  return count < min ? `expected ≥ ${min} Figma texts, got ${count} — wrong node id?` : null;
}
