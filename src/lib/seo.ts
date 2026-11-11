import type { Metadata } from "next";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { alternates, type RouteKey } from "@/i18n/routes";

export const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
/** Test copy (new.zavod.az): closed to search engines (robots.txt + X-Robots-Tag in next.config). */
export const siteNoindex = process.env.SITE_NOINDEX === "1";
export const siteName = "Zavod.az";

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
