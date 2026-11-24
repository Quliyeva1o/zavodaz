import type { MetadataRoute } from "next";
import { getFactorySitemapFiles, getFactorySitemapRows } from "@/features/factory/sitemap-queries";
import { factoryHref } from "@/i18n/routes";
import { localizedEntries } from "@/lib/sitemap-entries";

/** Published factories: only the main URL of each (no tabs), 3 languages with hreflang, <lastmod> = updated_at. /sitemaps/factories/sitemap/<n>.xml */
export async function generateSitemaps() {
  return Array.from({ length: await getFactorySitemapFiles() }, (_, id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const rows = await getFactorySitemapRows(Number(await props.id));
  return rows.flatMap((f) => localizedEntries((l) => factoryHref(f.slug, l), f.updatedAt));
}
