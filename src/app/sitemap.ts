import type { MetadataRoute } from "next";
import { getLandingCounts } from "@/features/catalog/queries";
import { FACTORY_TYPES } from "@/features/catalog/types";
import { getPagesUpdatedAt } from "@/features/pages/queries";
import { PAGE_KEYS, type PageKey } from "@/features/pages/types";
import { locales, type Localized } from "@/i18n/config";
import { alternates, recommendedHref, typeHref, type RouteKey } from "@/i18n/routes";
import { localizedEntries } from "@/lib/sitemap-entries";

const PUBLIC_STATIC: RouteKey[] = ["home", "catalog", "terms", "privacy", "help", "tariffs", "contact"];
const isPageKey = (route: RouteKey): route is PageKey => (PAGE_KEYS as string[]).includes(route);

/** One sitemap entry per language of a page, each with the full hreflang set. */
const entries = (urls: Localized, lastModified?: string | Date): MetadataRoute.Sitemap => localizedEntries((l) => urls[l], lastModified);

const perLocale = (path: (l: (typeof locales)[number]) => string) => Object.fromEntries(locales.map((l) => [l, path(l)])) as Localized;

/**
 * Static pages, the catalog (list, "Tövsiyə edilənlər", the 6 type pages) and the type × city / type × industry
 * landings with at least one published factory. Factories and products are their own split files
 * (app/sitemaps/factories, app/sitemaps/products, generateSitemaps); vacancy/news sitemaps follow in later steps.
 * <lastmod> of a DB-backed page is its pages.updated_at (cached, refreshed when the page is saved);
 * the home page and the catalog URLs have none (no single source of change).
 * The protocol limit is 50 000 URLs per file: today 6 types × ~80 cities/industries × 3 languages stays under
 * 2 000, so one file is enough. Beyond that, split with generateSitemaps().
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [updatedAt, landings] = await Promise.all([getPagesUpdatedAt(), getLandingCounts()]);
  const statics = PUBLIC_STATIC.flatMap((route) => entries(alternates(route), isPageKey(route) ? updatedAt[route] : undefined));
  const catalog = [
    ...entries(perLocale(recommendedHref)),
    ...FACTORY_TYPES.flatMap((type) => entries(perLocale((l) => typeHref(type, l)))),
    ...landings.filter((x) => x.count >= 1).flatMap((x) => entries(perLocale((l) => typeHref(x.type, l, x.slug)))),
  ];
  return [...statics, ...catalog];
}
