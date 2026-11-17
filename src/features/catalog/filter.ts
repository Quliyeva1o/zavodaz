// Pure functions, no zod and no server code: client components (mobile filter) import this too.
import { FACTORY_TYPES, isCooperation, isFactoryType } from "./types";
import type { CatalogFilter, CatalogScope, CatalogSort, Dict, Dictionaries, FactoryType } from "./types";

export type { CatalogFilter, CatalogScope } from "./types";

type SearchParams = Record<string, string | string[] | undefined>;

const SLUG = /^[a-z0-9-]{1,80}$/;
const PAGE = /^\d{1,5}$/;
const SORTS: readonly CatalogSort[] = ["rating_desc", "rating_asc"];

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
const all = (v: string | string[] | undefined): string[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

function slugParam(v: string | string[] | undefined): string | null {
  const s = first(v);
  return s !== undefined && SLUG.test(s) ? s : null;
}

/** Valid types, de-duplicated, in FACTORY_TYPES order (one canonical URL per selection). */
function typesParam(values: readonly string[]): FactoryType[] {
  const picked = new Set(values.filter(isFactoryType));
  return FACTORY_TYPES.filter((t) => picked.has(t));
}

const scopeTypes = (scope: CatalogScope) => (scope.types && scope.types.length > 0 ? scope.types : null);

/** URL query → normalised filter. Invalid values are dropped; the page scope always wins. */
export function parseCatalogParams(sp: SearchParams, scope: CatalogScope): CatalogFilter {
  const fixedTypes = scopeTypes(scope);
  const coop = first(sp.coop);
  const sort = first(sp.sort);
  const page = first(sp.page);
  const pageNum = page !== undefined && PAGE.test(page) ? Number(page) : 1;
  return {
    types: typesParam(fixedTypes ?? all(sp.type)),
    industry: scope.landing?.kind === "industry" ? scope.landing.slug : slugParam(sp.industry),
    city: scope.landing?.kind === "city" ? scope.landing.slug : slugParam(sp.city),
    product: slugParam(sp.product),
    model: slugParam(sp.model),
    coop: coop !== undefined && isCooperation(coop) ? coop : null,
    recommended: scope.recommended === true,
    sort: sort !== undefined && (SORTS as readonly string[]).includes(sort) ? (sort as CatalogSort) : "default",
    page: pageNum >= 1 ? pageNum : 1,
  };
}

/** Canonical query string ("" or "?type=…&page=2"): fixed key order, scope values and page=1 omitted. */
export function catalogSearch(f: CatalogFilter, scope: CatalogScope): string {
  const q = new URLSearchParams();
  if (!scopeTypes(scope)) for (const t of f.types) q.append("type", t);
  if (f.industry && scope.landing?.kind !== "industry") q.set("industry", f.industry);
  if (f.city && scope.landing?.kind !== "city") q.set("city", f.city);
  if (f.product) q.set("product", f.product);
  if (f.model) q.set("model", f.model);
  if (f.coop) q.set("coop", f.coop);
  if (f.sort !== "default") q.set("sort", f.sort);
  if (f.page > 1) q.set("page", String(f.page));
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Anything beyond the page scope and the page number: such URLs are `noindex, follow`. */
export function isFiltered(f: CatalogFilter, scope: CatalogScope): boolean {
  return catalogSearch({ ...f, page: 1 }, scope) !== "";
}

/**
 * R8: dictionary slugs that do not exist are dropped before the cached query, so crawler junk never becomes
 * a cache entry (the URL is still filtered → noindex, canonical base). A landing slug is the page's own and
 * stays (the landing page decides on 404).
 */
export function normalizeCatalogFilter(f: CatalogFilter, d: Dictionaries, scope: CatalogScope): CatalogFilter {
  const known = (list: Dict[], slug: string | null) => (slug !== null && list.some((x) => x.slug === slug) ? slug : null);
  const landing = scope.landing?.kind;
  return {
    ...f,
    industry: landing === "industry" ? f.industry : known(d.industries, f.industry),
    city: landing === "city" ? f.city : known(d.cities, f.city),
    product: known(d.productTypes, f.product),
    model: known(d.productionModels, f.model),
  };
}
