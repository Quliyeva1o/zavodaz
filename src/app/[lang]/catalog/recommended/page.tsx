import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { href, recommendedHref } from "@/i18n/routes";
import { parseCatalogParams } from "@/features/catalog/filter";
import { catalogMetadata, localizedPaths } from "@/lib/catalog-seo";
import { CatalogView } from "@/components/catalog/catalog-view";

// Blocking render (no static shell): the catalog must work without JavaScript, see CatalogView (R12).
export const instant = false;

const scope = { recommended: true };

export async function generateMetadata({ params, searchParams }: PageProps<"/[lang]/catalog/recommended">): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  const t = dict(lang);
  return catalogMetadata({
    lang,
    scope,
    filter: parseCatalogParams(await searchParams, scope),
    title: t.recommended,
    description: t.catalog.recommendedDescription,
    basePaths: localizedPaths(recommendedHref),
  });
}

export default async function RecommendedPage({ params, searchParams }: PageProps<"/[lang]/catalog/recommended">) {
  const lang = (await params).lang as Locale;
  const t = dict(lang);
  return (
    <CatalogView
      lang={lang}
      scope={scope}
      searchParams={searchParams}
      title={t.recommended}
      crumbs={[{ label: t.catalog.title, href: href("catalog", lang) }]}
      basePath={recommendedHref(lang)}
    />
  );
}
