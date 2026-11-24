import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { cacheTags } from "@/db/schema";

// No "server-only" and no next/cache here: scripts (scripts/seed/*) record invalidations too.

/** Header / footer contacts and socials (admin → Sayt ayarları). */
export const SETTINGS_TAG = "settings";

export const pageTag = (key: string) => `page:${key}`;
export const FAQ_TAG = "faq";
export const TARIFFS_TAG = "tariffs";
export const CONTACT_TAG = "contact";
/** Catalog lists and zavod pages (admin → Zavodlar). */
export const FACTORIES_TAG = "factories";
/** Filter dictionaries: cities, industries, product types, production models. */
export const DICTIONARIES_TAG = "dictionaries";
/** One factory page with its tabs, products and vacancies (admin writes, rating votes). */
export const factoryTag = (id: string) => `factory:${id}`;
/** Old slug paths → current ones (features/factory/slug-redirect.ts). */
export const REDIRECTS_TAG = "redirects";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any drizzle Postgres database or transaction
export type AnyPgDb = PgDatabase<PgQueryResultHKT, any, any>;

/**
 * Records tag invalidations in `cache_tags`; every app process applies them (./tag-sync.ts),
 * and a process started later replays them on its first sync.
 */
export async function recordTagInvalidations(db: AnyPgDb, tags: Iterable<string>, now = Date.now()) {
  const list = [...new Set(tags)];
  if (list.length === 0) return;
  await db
    .insert(cacheTags)
    .values(list.map((tag) => ({ tag, expiredAt: now })))
    .onConflictDoUpdate({ target: cacheTags.tag, set: { expiredAt: sql`excluded.expired_at` } });
}
