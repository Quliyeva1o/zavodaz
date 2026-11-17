const MAP: Record<string, string> = { ə: "e", ı: "i", ş: "s", ç: "c", ğ: "g", ö: "o", ü: "u" };

/** ASCII URL slug (spec §5): Azerbaijani letters transliterated, anything else becomes one dash. */
export function slugify(text: string): string {
  return text
    .replace(/İ/g, "i")
    .toLowerCase()
    .replace(/[əışçğöü]/g, (ch) => MAP[ch] ?? ch)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** `base`, else `base-2`, `base-3` … — the first one `taken` says is free. */
export async function uniqueSlug(base: string, taken: (s: string) => Promise<boolean>): Promise<string> {
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    if (!(await taken(candidate))) return candidate;
  }
}
