import type { MetadataRoute } from "next";
import { defaultLocale, locales } from "@/i18n/config";
import { alternates, type RouteKey } from "@/i18n/routes";
import { siteUrl } from "@/lib/seo";

const PUBLIC_STATIC: RouteKey[] = ["home", "terms", "privacy", "help", "tariffs", "contact"];

/** Static pages for now; factory/product/vacancy/news sitemaps are split files added in later steps. */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_STATIC.flatMap((route) => {
    const urls = alternates(route);
    return locales.map((l) => ({
      url: siteUrl + urls[l],
      alternates: { languages: { ...Object.fromEntries(locales.map((x) => [x, siteUrl + urls[x]])), "x-default": siteUrl + urls[defaultLocale] } },
    }));
  });
}
