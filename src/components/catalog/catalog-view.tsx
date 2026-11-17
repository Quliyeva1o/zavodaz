import Link from "next/link";
import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { catalogSearch, isFiltered, normalizeCatalogFilter, parseCatalogParams } from "@/features/catalog/filter";
import { getCatalogPage, getDictionaries } from "@/features/catalog/queries";
import { PAGE_SIZE, type CatalogScope } from "@/features/catalog/types";
import { itemListJsonLd } from "@/lib/catalog-seo";
import { siteUrl } from "@/lib/seo";
import { JsonLd } from "@/lib/structured-data";
import { PageShell } from "@/components/page/page-shell";
import { Icon } from "@/components/ui/icon";
import { FactoryCard } from "./factory-card";
import { FilterSidebar } from "./filter-sidebar";
import { Pagination } from "./pagination";

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
  const c = dict(lang).catalog;
  return (
    <PageShell lang={lang} title={title} currentPath={basePath} crumbs={crumbs} figma="catalog">
      <div data-figma="catalog-main" className="flex flex-col gap-4 max-lg:-mt-2 lg:flex-row lg:items-start lg:gap-8">
        {/* Figma "Button" 736:23890: 288×40, padding 8/10 (9 + border), r4, gray-200 stroke; Funnel 20 + "Filtr" body-md. */}
        <a
          href="#filtr"
          className="relative flex h-10 items-center gap-1.5 rounded-[4px] border border-gray-200 px-[9px] text-body-md text-brand-950 after:absolute after:inset-x-0 after:-inset-y-1 lg:hidden"
        >
          <Icon name="funnel" size={20} />
          {c.filter}
        </a>
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
  return (
    <>
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
