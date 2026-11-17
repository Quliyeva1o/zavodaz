import type { MetadataRoute } from "next";
import { getPagesUpdatedAt } from "@/features/pages/queries";
import { PAGE_KEYS, type PageKey } from "@/features/pages/types";
import { defaultLocale, locales } from "@/i18n/config";
import { alternates, type RouteKey } from "@/i18n/routes";
import { siteUrl } from "@/lib/seo";

const PUBLIC_STATIC: RouteKey[] = ["home", "terms", "privacy", "help", "tariffs", "contact"];
const isPageKey = (route: RouteKey): route is PageKey => (PAGE_KEYS as string[]).includes(route);

/**
 * Static pages for now; factory/product/vacancy/news sitemaps are split files added in later steps.
 * <lastmod> of a DB-backed page is its pages.updated_at (cached, refreshed when the page is saved);
 * the home page has no single source of change yet, so it has none.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const updatedAt = await getPagesUpdatedAt();
  return PUBLIC_STATIC.flatMap((route) => {
    const urls = alternates(route);
    const lastModified = isPageKey(route) ? updatedAt[route] : undefined;
    return locales.map((l) => ({
      url: siteUrl + urls[l],
      ...(lastModified ? { lastModified } : {}),
      alternates: { languages: { ...Object.fromEntries(locales.map((x) => [x, siteUrl + urls[x]])), "x-default": siteUrl + urls[defaultLocale] } },
    }));
  });
}
