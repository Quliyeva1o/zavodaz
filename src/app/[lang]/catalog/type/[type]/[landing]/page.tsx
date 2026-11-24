import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pick, type Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { typeHref } from "@/i18n/routes";
import { normalizeCatalogFilter, parseCatalogParams, resolveLanding } from "@/features/catalog/filter";
import { getCatalogPage, getDictionaries } from "@/features/catalog/queries";
import { isFactoryType, type CatalogScope } from "@/features/catalog/types";
import { catalogMetadata, landingDescription, landingTitle, localizedPaths } from "@/lib/catalog-seo";
import { CatalogView } from "@/components/catalog/catalog-view";

// Blocking render (no static shell): the catalog must work without JavaScript, see CatalogView (R12).
export const instant = false;

type Props = PageProps<"/[lang]/catalog/type/[type]/[landing]">;

/** The landing slug is a raw URL segment: validated against the dictionaries (city first, then industry). */
async function resolve(type: string, slug: string) {
  if (!isFactoryType(type)) return null;
  const landing = resolveLanding(slug, await getDictionaries());
  return landing && { type, landing };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang: l, type: typeParam, landing: slug } = await params;
  const found = await resolve(typeParam, slug);
  if (!found) return {};
  const lang = l as Locale;
  const { type, landing } = found;
  const title = landingTitle(lang, dict(lang).factoryTypes[type], pick(landing.dict.name, lang));
  const scope: CatalogScope = { types: [type], landing: { kind: landing.kind, slug } };
  const filter = parseCatalogParams(await searchParams, scope);
  // Cached query shared with the page itself; a landing without results is `noindex` (it stays out of the sitemap too).
  const { total } = await getCatalogPage(normalizeCatalogFilter(filter, await getDictionaries(), scope));
  return catalogMetadata({
    lang,
    scope,
    filter,
    title,
    description: landingDescription(lang, title),
    basePaths: localizedPaths((x) => typeHref(type, x, slug)),
    empty: total === 0,
  });
}

export default async function LandingPage({ params, searchParams }: Props) {
  const { lang: l, type: typeParam, landing: slug } = await params;
  const found = await resolve(typeParam, slug);
  if (!found) notFound();
  const lang = l as Locale;
  const { type, landing } = found;
  const t = dict(lang);
  return (
    <CatalogView
      lang={lang}
      scope={{ types: [type], landing: { kind: landing.kind, slug } }}
      searchParams={searchParams}
      title={landingTitle(lang, t.factoryTypes[type], pick(landing.dict.name, lang))}
      crumbs={[{ label: t.factoryTypes[type], href: typeHref(type, lang) }]}
      crumbLabel={pick(landing.dict.name, lang)}
      basePath={typeHref(type, lang, slug)}
    />
  );
}
