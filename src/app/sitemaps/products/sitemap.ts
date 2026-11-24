import type { MetadataRoute } from "next";
import { getProductSitemapFiles, getProductSitemapRows } from "@/features/factory/sitemap-queries";
import { productHref } from "@/i18n/routes";
import { localizedEntries } from "@/lib/sitemap-entries";

/** Published products of published factories, 3 languages with hreflang, <lastmod> = updated_at. /sitemaps/products/sitemap/<n>.xml */
export async function generateSitemaps() {
  return Array.from({ length: await getProductSitemapFiles() }, (_, id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const rows = await getProductSitemapRows(Number(await props.id));
  return rows.flatMap((p) => localizedEntries((l) => productHref(p.factorySlug, p, l), p.updatedAt));
}
