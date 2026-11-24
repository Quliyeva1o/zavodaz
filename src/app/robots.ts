import type { MetadataRoute } from "next";
import { getFactorySitemapFiles, getProductSitemapFiles } from "@/features/factory/sitemap-queries";
import { locales } from "@/i18n/config";
import { href } from "@/i18n/routes";
import { siteNoindex, siteUrl } from "@/lib/seo";

// Spec 7.3: cabinet, admin and auth pages are closed to crawlers.
const closed = ["cabinet", "login", "register"] as const;

/** The split files (factories, products): /sitemaps/<kind>/sitemap/<n>.xml, one per 16 666 entities. */
async function splitSitemaps(): Promise<string[]> {
  const [factories, products] = await Promise.all([getFactorySitemapFiles(), getProductSitemapFiles()]);
  const urls = (kind: string, n: number) => Array.from({ length: n }, (_, i) => `${siteUrl}/sitemaps/${kind}/sitemap/${i}.xml`);
  return [...urls("factories", factories), ...urls("products", products)];
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  if (siteNoindex) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", ...locales.flatMap((l) => closed.map((r) => href(r, l)))],
    },
    host: siteUrl,
    sitemap: [`${siteUrl}/sitemap.xml`, ...(await splitSitemaps())],
  };
}
