import type { Metadata } from "next";
import { getPage } from "@/features/pages/queries";
import { pageSeoTitle, SITE_NAME } from "@/features/pages/seo-title";
import type { PageKey } from "@/features/pages/types";
import { defaultLocale, locales, pick, type Locale } from "@/i18n/config";
import { alternates, type RouteKey } from "@/i18n/routes";
import { siteUrl } from "@/lib/env";

export { siteUrl };
/** Test copy (new.zavod.az): closed to search engines (robots.txt + X-Robots-Tag in next.config). */
export const siteNoindex = process.env.SITE_NOINDEX === "1";
export const siteName = SITE_NAME;

const ogLocale: Record<Locale, string> = { az: "az_AZ", en: "en_US", ru: "ru_RU" };

/** Canonical, hreflang (az / en / ru / x-default) and Open Graph for a page with a fixed URL. */
export function pageMetadata(opts: { route: RouteKey; lang: Locale; title: string; description?: string }): Metadata {
  const urls = alternates(opts.route);
  return {
    title: opts.title,
    description: opts.description,
    alternates: {
      canonical: urls[opts.lang],
      languages: { ...urls, "x-default": urls[defaultLocale] },
    },
    openGraph: {
      type: "website",
      siteName,
      title: opts.title,
      description: opts.description,
      url: urls[opts.lang],
      locale: ogLocale[opts.lang],
      alternateLocale: locales.filter((l) => l !== opts.lang).map((l) => ogLocale[l]),
    },
  };
}

/** Metadata of a DB-backed static page: admin SEO fields, falling back to "<title> | Zavod.az" (see pageSeoTitle). */
export async function staticPageMetadata(key: PageKey, lang: Locale): Promise<Metadata> {
  const p = await getPage(key);
  const title = pageSeoTitle(p, lang);
  const description = pick(p.seo.description, lang) || undefined;
  return pageMetadata({ route: key, lang, title, description });
}
