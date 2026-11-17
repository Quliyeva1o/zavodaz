import { and, asc, count, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { dictCities, dictIndustries, factories, media } from "@/db/schema";
import type { AnyPgDb } from "@/lib/cache/tag-store";
import { FACTORY_TYPES, PAGE_SIZE } from "./types";
import type { CatalogFilter, Dict, Dictionaries, FactoryCardData, FactoryType } from "./types";

// No "server-only" and no next/cache: the uncached SQL, called by ./queries.ts and by the DB test
// (tests/e2e/catalog-query.spec.ts) inside a rolled-back transaction.

/**
 * Literal predicate (not a bound parameter): the partial indexes (`WHERE status = 'published'`) match
 * even under a generic prepared plan (the db client uses `prepare: true`).
 */
const PUBLISHED = sql`${factories.status} = 'published'`;

export type CatalogIds = { industryId: number | null; cityId: number | null; productTypeId: number | null; modelId: number | null };
export type CatalogPage = { items: FactoryCardData[]; total: number; pageCount: number };
export type LandingCount = { type: FactoryType; kind: "city" | "industry"; slug: string; count: number };

/** Filter slugs → dictionary ids; `null` when any slug is unknown (the result is empty). */
export function resolveCatalogIds(f: CatalogFilter, d: Dictionaries): CatalogIds | null {
  const lookup = (list: Dict[], slug: string | null): number | null | undefined =>
    slug === null ? null : list.find((x) => x.slug === slug)?.id;
  const ids = {
    industryId: lookup(d.industries, f.industry),
    cityId: lookup(d.cities, f.city),
    productTypeId: lookup(d.productTypes, f.product),
    modelId: lookup(d.productionModels, f.model),
  };
  if (Object.values(ids).some((v) => v === undefined)) return null;
  return ids as CatalogIds;
}

export async function buildCatalogQuery(db: AnyPgDb, f: CatalogFilter, ids: CatalogIds): Promise<CatalogPage> {
  const where = and(
    PUBLISHED,
    f.types.length ? inArray(factories.type, f.types) : undefined,
    ids.industryId !== null ? eq(factories.industryId, ids.industryId) : undefined,
    ids.cityId !== null ? eq(factories.cityId, ids.cityId) : undefined,
    ids.productTypeId !== null ? eq(factories.productTypeId, ids.productTypeId) : undefined,
    ids.modelId !== null ? sql`${factories.productionModelIds} @> ARRAY[${ids.modelId}]::int[]` : undefined,
    f.coop ? sql`${factories.cooperation} @> ARRAY[${f.coop}]::text[]` : undefined,
    f.recommended ? gt(factories.tariffRank, 0) : undefined,
  );
  // Default (user decision 2026-11-17): VIP → Premium → rest, verified first, newest first (factories_pub_default_idx).
  const order =
    f.sort === "rating_desc"
      ? [desc(factories.ratingAvg), desc(factories.ratingCount), desc(factories.id)]
      : f.sort === "rating_asc"
        ? [asc(factories.ratingAvg), desc(factories.ratingCount), desc(factories.id)]
        : [desc(factories.tariffRank), desc(factories.verified), desc(factories.createdAt), desc(factories.id)];

  const [rows, [{ n: total }]] = await Promise.all([
    db
      .select({
        id: factories.id,
        slug: factories.slug,
        name: factories.name,
        about: factories.about,
        type: factories.type,
        verified: factories.verified,
        ratingAvg: factories.ratingAvg,
        coverId: media.id,
        coverVariants: media.variants,
        coverBlur: media.blur,
        coverWidth: media.width,
        coverHeight: media.height,
      })
      .from(factories)
      .leftJoin(media, eq(media.id, factories.coverId))
      .where(where)
      .orderBy(...order)
      .limit(PAGE_SIZE)
      .offset((f.page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(factories).where(where),
  ]);

  const items: FactoryCardData[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    about: r.about,
    type: r.type,
    verified: r.verified,
    ratingAvg: Number(r.ratingAvg),
    cover:
      r.coverId !== null
        ? { id: r.coverId, variants: r.coverVariants!, blur: r.coverBlur!, width: r.coverWidth!, height: r.coverHeight! }
        : null,
  }));
  const n = Number(total);
  return { items, total: n, pageCount: Math.ceil(n / PAGE_SIZE) };
}

/** Published factories per (type, city) and (type, industry) — landings with ≥ 1 result (sitemap). */
export async function buildLandingCounts(db: AnyPgDb): Promise<LandingCount[]> {
  const [byCity, byIndustry] = await Promise.all([
    db
      .select({ type: factories.type, slug: dictCities.slug, n: count() })
      .from(factories)
      .innerJoin(dictCities, eq(dictCities.id, factories.cityId))
      .where(PUBLISHED)
      .groupBy(factories.type, dictCities.slug),
    db
      .select({ type: factories.type, slug: dictIndustries.slug, n: count() })
      .from(factories)
      .innerJoin(dictIndustries, eq(dictIndustries.id, factories.industryId))
      .where(PUBLISHED)
      .groupBy(factories.type, dictIndustries.slug),
  ]);
  const rows: LandingCount[] = [
    ...byCity.map((r) => ({ type: r.type, kind: "city" as const, slug: r.slug, count: Number(r.n) })),
    ...byIndustry.map((r) => ({ type: r.type, kind: "industry" as const, slug: r.slug, count: Number(r.n) })),
  ];
  const typeIndex = (t: FactoryType) => FACTORY_TYPES.indexOf(t);
  return rows.sort(
    (a, b) => typeIndex(a.type) - typeIndex(b.type) || a.kind.localeCompare(b.kind) || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0),
  );
}
