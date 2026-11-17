import Link from "next/link";
import { notFound } from "next/navigation";
import { pick, type Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { catalogSearch, isFiltered, normalizeCatalogFilter, parseCatalogParams } from "@/features/catalog/filter";
import { getCatalogPage, getDictionaries } from "@/features/catalog/queries";
import { COOPERATION, PAGE_SIZE, type CatalogScope, type Dict, type Dictionaries } from "@/features/catalog/types";
import { itemListJsonLd } from "@/lib/catalog-seo";
import { siteUrl } from "@/lib/seo";
import { JsonLd } from "@/lib/structured-data";
import { PageShell } from "@/components/page/page-shell";
import { FactoryCard } from "./factory-card";
import { FilterSidebar } from "./filter-sidebar";
import { MobileFilterButton } from "./mobile-filter-button";
import type { FilterGroup } from "./mobile-filter";
import { Pagination } from "./pagination";
import { TYPE_ORDER } from "./type-checkboxes";

type SearchParams = Record<string, string | string[] | undefined>;

type Props = {
  lang: Locale;
  scope: CatalogScope;
  searchParams: Promise<SearchParams>;
  title: string;
  /** Crumbs between "Ana səhifə" and `title` (type pages: Kataloq). */
  crumbs?: { label: string; href: string }[];
  /** The list's filterless URL in `lang`. */
  basePath: string;
};

/** 3 columns at 1440 (Figma 281:7097: 315 cards, gaps 20); 2 from 1024 (and 640) so cards stay readable; 1 on mobile (gap 16). */
const grid = "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3";

/**
 * Catalog list page, Figma 273:6507 (desktop) / 736:23868 (mobile): breadcrumb, H1, then filter sidebar
 * (303) + 32 + grid (985) with pagination 60 below (mobile: "Filtr" button, cards, pagination 32 below).
 * Also used by the type, recommended and landing pages.
 *
 * Deliberately NOT inside <Suspense>: content streamed into a Suspense boundary arrives in a hidden <div> that
 * only JavaScript reveals, so without JS (and for crawlers that do not run it) the filter and the cards would
 * be invisible. The page renders blocking instead (route `export const instant = false`, otherwise Cache
 * Components rejects request-time data outside Suspense); the data itself comes from the `use cache` queries.
 */
export function CatalogView({ lang, scope, searchParams, title, crumbs, basePath }: Props) {
  return (
    <PageShell lang={lang} title={title} currentPath={basePath} crumbs={crumbs} figma="catalog">
      <div data-figma="catalog-main" className="flex flex-col gap-4 max-lg:-mt-2 lg:flex-row lg:items-start lg:gap-8">
        <CatalogResults lang={lang} scope={scope} searchParams={searchParams} basePath={basePath} />
      </div>
    </PageShell>
  );
}

async function CatalogResults({ lang, scope, searchParams, basePath }: Omit<Props, "title" | "crumbs">) {
  const c = dict(lang).catalog;
  const parsed = parseCatalogParams(await searchParams, scope);
  const dicts = await getDictionaries();
  // R8: unknown slugs never reach the cached query (one cache entry per real filter).
  const filter = normalizeCatalogFilter(parsed, dicts, scope);
  const { items, pageCount } = await getCatalogPage(filter);
  // Cache Components has already committed status 200 here: this renders not-found + noindex, not a 404 status.
  if (pageCount > 0 && filter.page > pageCount) notFound();

  const filtered = isFiltered(parsed, scope);
  const hrefFor = (page: number) => basePath + catalogSearch({ ...filter, page }, scope);
  const groups = filterGroups(lang, scope, dicts);
  return (
    <>
      {/* Mobile: Figma "Button" 736:23890 opens the lazy dialog (Mob/Filtr). Without JS the <noscript> link shows the sidebar (:target). */}
      <MobileFilterButton
        label={c.filter}
        groups={groups}
        filter={filter}
        scope={scope}
        basePath={basePath}
        labels={{ back: c.back, reset: c.reset }}
      />
      <noscript>
        <a href="#filtr" className="flex h-10 items-center rounded-[4px] border border-gray-200 px-[9px] text-body-md text-brand-950 lg:hidden">
          {c.filter}
        </a>
      </noscript>
      {/* Keyed by the filter: after a navigation (reset link, back/forward) the form shows the URL's values, not stale DOM state. */}
      <FilterSidebar key={catalogSearch({ ...filter, page: 1 }, scope)} lang={lang} scope={scope} filter={filter} dicts={dicts} filtered={filtered} basePath={basePath} />
      <section aria-labelledby="catalog-results" className="flex min-w-0 flex-1 flex-col gap-8 lg:gap-[60px]">
        <h2 id="catalog-results" className="sr-only">
          {c.results}
        </h2>
        {items.length > 0 ? (
          <div data-figma="catalog-grid" className={grid}>
            {items.map((item, i) => (
              <FactoryCard key={item.id} data={item} lang={lang} priority={i < 3} />
            ))}
          </div>
        ) : (
          // Not in Figma: the search "nothing found" text style (182:8179 desktop 22/28.16, 715:22393 mobile 18/24.3, gray-500).
          <div className="flex flex-col items-center gap-6 py-[60px] text-center">
            <p className="text-subtitle-3 text-gray-500 lg:text-subtitle-1">{c.empty}</p>
            {filtered && (
              <Link href={basePath} className="text-body-md text-brand-500 hover:underline">
                {c.reset}
              </Link>
            )}
          </div>
        )}
        <Pagination current={filter.page} count={pageCount} hrefFor={hrefFor} label={c.pages} lang={lang} />
        {items.length > 0 && <JsonLd data={itemListJsonLd(items, lang, siteUrl, (filter.page - 1) * PAGE_SIZE)} />}
      </section>
    </>
  );
}

/** Mobile dialog rows in Figma order (Mob/Filtr 737:22004); groups the page scope fixes are left out. */
function filterGroups(lang: Locale, scope: CatalogScope, dicts: Dictionaries): FilterGroup[] {
  const t = dict(lang);
  const c = t.catalog;
  const all = { value: "", label: c.all };
  const fromDict = (list: Dict[]) => [all, ...list.map((d) => ({ value: d.slug, label: pick(d.name, lang) }))];
  const landing = scope.landing?.kind;
  const groups: (FilterGroup | false)[] = [
    !scope.types?.length && { key: "type", title: c.filters.type, options: [all, ...TYPE_ORDER.map((v) => ({ value: v, label: t.factoryType[v] }))] },
    landing !== "industry" && { key: "industry", title: c.filters.industry, options: fromDict(dicts.industries) },
    landing !== "city" && { key: "city", title: c.filters.city, options: fromDict(dicts.cities) },
    { key: "product", title: c.filters.product, options: fromDict(dicts.productTypes) },
    { key: "model", title: c.filters.model, options: fromDict(dicts.productionModels) },
    { key: "coop", title: c.filters.coop, options: [all, ...COOPERATION.map((v) => ({ value: v, label: c.coop[v] }))] },
    {
      key: "sort",
      title: c.filters.sort,
      options: [all, { value: "rating_desc", label: c.sortHigh }, { value: "rating_asc", label: c.sortLow }],
    },
  ];
  return groups.filter((g) => g !== false);
}
