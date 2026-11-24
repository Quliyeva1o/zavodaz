import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { alternates, href } from "@/i18n/routes";
import { parseCatalogParams } from "@/features/catalog/filter";
import { catalogMetadata } from "@/lib/catalog-seo";
import { CatalogView } from "@/components/catalog/catalog-view";

// Blocking render (no static shell): the catalog must work without JavaScript, see CatalogView.
export const instant = false;

export async function generateMetadata({ params, searchParams }: PageProps<"/[lang]/catalog">): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  const c = dict(lang).catalog;
  const filter = parseCatalogParams(await searchParams, {});
  return catalogMetadata({ lang, scope: {}, filter, title: c.title, description: c.description, basePaths: alternates("catalog") });
}

export default async function CatalogPage({ params, searchParams }: PageProps<"/[lang]/catalog">) {
  const lang = (await params).lang as Locale;
  return <CatalogView lang={lang} scope={{}} searchParams={searchParams} title={dict(lang).catalog.title} basePath={href("catalog", lang)} />;
}
