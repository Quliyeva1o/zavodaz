import type { MetadataRoute } from "next";
import { defaultLocale, locales, type Locale, type Localized } from "@/i18n/config";
import { siteUrl } from "@/lib/seo";

/** One sitemap entry per language of a page, each with the full hreflang set (+ x-default). */
export function localizedEntries(path: (l: Locale) => string, lastModified?: string | Date): MetadataRoute.Sitemap {
  const urls = Object.fromEntries(locales.map((l) => [l, path(l)])) as Localized;
  const languages = { ...Object.fromEntries(locales.map((l) => [l, siteUrl + urls[l]])), "x-default": siteUrl + urls[defaultLocale] };
  return locales.map((l) => ({ url: siteUrl + urls[l], ...(lastModified ? { lastModified } : {}), alternates: { languages } }));
}
