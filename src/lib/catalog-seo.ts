import type { Metadata } from "next";
import { defaultLocale, locales, type Locale, type Localized } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { factoryHref } from "@/i18n/routes";
import { isFiltered, type CatalogFilter, type CatalogScope } from "@/features/catalog/filter";
import { SITE_NAME } from "@/features/pages/seo-title";

// No env / server imports: unit-tested directly (tests/unit/catalog-seo.test.ts).

/**
 * Catalog list metadata (controller SEO rulings): the unfiltered list is indexable, `?page=N` (N ≥ 2) is its
 * own canonical; any filter — sort and unknown slugs included — is `noindex, follow` with the filterless base
 * as canonical (no hreflang: only canonical URLs get alternates). `basePaths` = the list's base URL per language.
 */
export function catalogMetadata(opts: {
  lang: Locale;
  scope: CatalogScope;
  filter: CatalogFilter;
  title: string;
  description: string;
  basePaths: Localized;
}): Metadata {
  const { lang, filter, basePaths } = opts;
  const filtered = isFiltered(filter, opts.scope);
  const page = filtered ? 1 : filter.page;
  const query = page > 1 ? `?page=${page}` : "";
  const title = `${page > 1 ? `${opts.title} — ${dict(lang).catalog.page.replace("{n}", String(page))}` : opts.title} | ${SITE_NAME}`;
  const canonical = basePaths[lang] + query;
  return {
    title,
    description: opts.description,
    alternates: {
      canonical,
      languages: filtered
        ? undefined
        : { ...(Object.fromEntries(locales.map((l) => [l, basePaths[l] + query])) as Localized), "x-default": basePaths[defaultLocale] + query },
    },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: { type: "website", siteName: SITE_NAME, title, description: opts.description, url: canonical },
  };
}

/** schema.org ItemList of the factories on one catalog page; `offset` = factories on the previous pages. */
export function itemListJsonLd(items: { slug: string; name: string }[], lang: Locale, origin: string, offset = 0) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: offset + i + 1, url: origin + factoryHref(it.slug, lang), name: it.name })),
  };
}
