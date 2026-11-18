import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { href, typeHref } from "@/i18n/routes";
import { parseCatalogParams } from "@/features/catalog/filter";
import { isFactoryType } from "@/features/catalog/types";
import { catalogMetadata, localizedPaths, typeDescription } from "@/lib/catalog-seo";
import { CatalogView } from "@/components/catalog/catalog-view";

// Blocking render (no static shell): the catalog must work without JavaScript, see CatalogView (R12).
export const instant = false;

type Props = PageProps<"/[lang]/catalog/type/[type]">;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang: l, type } = await params;
  if (!isFactoryType(type)) return {};
  const lang = l as Locale;
  const title = dict(lang).factoryTypes[type];
  const scope = { types: [type] };
  return catalogMetadata({
    lang,
    scope,
    filter: parseCatalogParams(await searchParams, scope),
    title,
    description: typeDescription(lang, title),
    basePaths: localizedPaths((l) => typeHref(type, l)),
  });
}

export default async function TypePage({ params, searchParams }: Props) {
  const { lang: l, type } = await params;
  if (!isFactoryType(type)) notFound();
  const lang = l as Locale;
  const t = dict(lang);
  return (
    <CatalogView
      lang={lang}
      scope={{ types: [type] }}
      searchParams={searchParams}
      title={t.factoryTypes[type]}
      crumbs={[{ label: t.catalog.title, href: href("catalog", lang) }]}
      basePath={typeHref(type, lang)}
    />
  );
}
