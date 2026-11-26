// The internal product route `/<lang>/factory/<slug>/products/<code>[-<slug>]` (what the proxy rewrites to) and its
// canonical public URL. No server imports: used by the proxy and unit-tested.
import { locales, type Locale } from "@/i18n/config";
import { productHref, productKey, productSegment } from "@/i18n/routes";

const INTERNAL = new RegExp(`^/(${locales.join("|")})/factory/([^/]+)/products/([^/]+)$`);

export type ProductPath = { lang: Locale; factorySlug: string; key: string; code: number };

export function parseProductPath(internal: string): ProductPath | null {
  const m = INTERNAL.exec(internal);
  if (!m) return null;
  const code = productKey(m[3]);
  return code === null ? null : { lang: m[1] as Locale, factorySlug: m[2], key: m[3], code };
}

/** The public URL with the product's current slug, or null when the URL already has it. */
export function canonicalProductPath(p: ProductPath, slug: string): string | null {
  if (productSegment({ id: p.code, slug }) === p.key) return null;
  return productHref(p.factorySlug, { id: p.code, slug }, p.lang);
}
