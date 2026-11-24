import "server-only";
import { asc } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { dictCities, dictIndustries, dictProductionModels, dictProductTypes } from "@/db/schema";
import { DICTIONARIES_TAG, FACTORIES_TAG } from "@/lib/cache/tags";
import { buildCatalogQuery, buildLandingCounts, resolveCatalogIds, type CatalogPage, type LandingCount } from "./catalog-sql";
import type { CatalogFilter, Dict, Dictionaries } from "./types";

export type { CatalogPage, LandingCount } from "./catalog-sql";
export type { Dict, Dictionaries, FactoryCardData } from "./types";

export async function getDictionaries(): Promise<Dictionaries> {
  "use cache";
  cacheLife("max");
  cacheTag(DICTIONARIES_TAG);
  type DictTable = typeof dictCities | typeof dictIndustries | typeof dictProductTypes | typeof dictProductionModels;
  const list = (t: DictTable): Promise<Dict[]> =>
    db.select({ id: t.id, slug: t.slug, name: t.name }).from(t).orderBy(asc(t.sort), asc(t.id));
  const [cities, industries, productTypes, productionModels] = await Promise.all([
    list(dictCities),
    list(dictIndustries),
    list(dictProductTypes),
    list(dictProductionModels),
  ]);
  return { cities, industries, productTypes, productionModels };
}

/** `f` must be a plain object (it is the cache key); build it with parseCatalogParams. */
export async function getCatalogPage(f: CatalogFilter): Promise<CatalogPage> {
  "use cache";
  cacheLife("max");
  cacheTag(FACTORIES_TAG, DICTIONARIES_TAG);
  const ids = resolveCatalogIds(f, await getDictionaries());
  if (!ids) return { items: [], total: 0, pageCount: 0 }; // unknown slug: no results, no query
  return buildCatalogQuery(db, f, ids);
}

/** Landings with at least one published factory (sitemap). */
export async function getLandingCounts(): Promise<LandingCount[]> {
  "use cache";
  cacheLife("max");
  cacheTag(FACTORIES_TAG, DICTIONARIES_TAG);
  return buildLandingCounts(db);
}
