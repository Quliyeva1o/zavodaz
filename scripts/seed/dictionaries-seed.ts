// Idempotent seed of the catalog filter dictionaries (Figma values + all cities). Existing slugs are never
// overwritten (admin edits win). Used by seedContent (inside its transaction) and by `db:seed-dictionaries`.
import type { PgTable } from "drizzle-orm/pg-core";
import { dictCities, dictIndustries, dictProductionModels, dictProductTypes } from "../../src/db/schema";
import { DICTIONARY_SEED, type DictSeedItem } from "../../src/features/catalog/dictionaries.seed";
import { DICTIONARIES_TAG, FACTORIES_TAG, recordTagInvalidations, type AnyPgDb } from "../../src/lib/cache/tag-store";

const TABLES = {
  cities: dictCities,
  industries: dictIndustries,
  productTypes: dictProductTypes,
  productionModels: dictProductionModels,
} as const;

type DictTable = typeof dictCities;

/** Inserts the missing dictionary rows; returns the cache tags to invalidate (empty when nothing was inserted). */
export async function seedDictionariesIn(db: AnyPgDb): Promise<string[]> {
  let inserted = 0;
  for (const key of Object.keys(TABLES) as (keyof typeof TABLES)[]) {
    const table = TABLES[key] as DictTable & PgTable;
    const items: DictSeedItem[] = DICTIONARY_SEED[key];
    const rows = await db
      .insert(table)
      .values(items.map((item, sort) => ({ slug: item.slug, name: item.name, sort })))
      .onConflictDoNothing({ target: table.slug })
      .returning({ id: table.id });
    inserted += rows.length;
  }
  return inserted > 0 ? [DICTIONARIES_TAG, FACTORIES_TAG] : [];
}

/** Standalone entry: own transaction, records the tags it invalidated. */
export async function seedDictionaries(db: AnyPgDb): Promise<string[]> {
  return db.transaction(async (tx) => {
    const tags = await seedDictionariesIn(tx);
    await recordTagInvalidations(tx, tags);
    return tags;
  });
}
