import "server-only";
import { and, arrayContains, asc, eq, notExists, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { dictCities, dictIndustries, dictProductionModels, dictProductTypes, factories } from "@/db/schema";
import type { DictKind } from "./dict-admin";

// The four tables have identical columns (dictColumns); typed as one so queries can take any of them.
export const DICT_TABLES = {
  cities: dictCities,
  industries: dictIndustries,
  "product-types": dictProductTypes,
  "production-models": dictProductionModels,
} as unknown as Record<DictKind, typeof dictCities>;

/** Cities and industries share the landing URL segment (`/<type>/<slug>`): their slugs must not collide. */
export const LANDING_PEER: Partial<Record<DictKind, DictKind>> = { cities: "industries", industries: "cities" };

/** Condition "factory uses dictionary entry `id`". */
function usedBy(kind: DictKind, id: number): SQL {
  switch (kind) {
    case "cities":
      return eq(factories.cityId, id);
    case "industries":
      return eq(factories.industryId, id);
    case "product-types":
      return eq(factories.productTypeId, id);
    case "production-models":
      return arrayContains(factories.productionModelIds, [id]);
  }
}

export type DictRow = { id: number; slug: string; name: { az: string; en: string; ru: string }; sort: number; used: number };

/** All entries in site order (sort, id) with the number of factories (any status) that use each. */
export async function listDictWithUsage(kind: DictKind): Promise<DictRow[]> {
  const t = DICT_TABLES[kind];
  // Drizzle leaves columns unqualified in a one-table select, so the correlated subquery names them itself.
  const outerId = sql`${t}.${sql.identifier("id")}`;
  const column = { cities: "city_id", industries: "industry_id", "product-types": "product_type_id" } as const;
  const usage =
    kind === "production-models"
      ? sql<number>`(select count(*)::int from ${factories} f where f.production_model_ids @> array[${outerId}]::int[])`
      : sql<number>`(select count(*)::int from ${factories} f where f.${sql.identifier(column[kind])} = ${outerId})`;
  return db.select({ id: t.id, slug: t.slug, name: t.name, sort: t.sort, used: usage }).from(t).orderBy(asc(t.sort), asc(t.id));
}

export async function usageCount(kind: DictKind, id: number): Promise<number> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(factories).where(usedBy(kind, id));
  return n;
}

/** Deletes the entry only if no factory uses it (checked in the same statement). */
export async function deleteUnusedDictEntry(kind: DictKind, id: number): Promise<boolean> {
  const t = DICT_TABLES[kind];
  const used = db.select({ one: sql`1` }).from(factories).where(usedBy(kind, id));
  const rows = await db
    .delete(t)
    .where(and(eq(t.id, id), notExists(used)))
    .returning({ id: t.id });
  return rows.length > 0;
}
