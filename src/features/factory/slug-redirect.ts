// Old slug URLs → 301 (spec §5; step-2 R19). No "server-only": the admin actions, the cached lookup (./queries.ts)
// and the DB tests share it; every function takes the database (or the caller's transaction).
import { inArray, sql } from "drizzle-orm";
import { redirects } from "@/db/schema";
import { FACTORY_TYPES } from "@/features/catalog/types";
import { locales } from "@/i18n/config";
import { FACTORY_TABS, factoryHref, typeHref } from "@/i18n/routes";
import type { AnyPgDb } from "@/lib/cache/tag-store";

export type RedirectPair = { from: string; to: string };

/** Every public path of a factory (all languages, the factory URL and each tab) under the old slug → the new one. */
export function factorySlugRedirects(oldSlug: string, newSlug: string): RedirectPair[] {
  if (oldSlug === newSlug) return [];
  return locales.flatMap((l) => FACTORY_TABS.map((tab) => ({ from: factoryHref(oldSlug, l, tab), to: factoryHref(newSlug, l, tab) })));
}

/** A city or industry slug is the landing segment under every factory type (`/fabrikler/baki`), in every language. */
export function landingSlugRedirects(oldSlug: string, newSlug: string): RedirectPair[] {
  if (oldSlug === newSlug) return [];
  return locales.flatMap((l) => FACTORY_TYPES.map((t) => ({ from: typeHref(t, l, oldSlug), to: typeHref(t, l, newSlug) })));
}

/** The redirect sources a factory slug owns (3 languages × factory URL and tabs). */
export const factorySlugPaths = (slug: string): string[] => locales.flatMap((l) => FACTORY_TABS.map((tab) => factoryHref(slug, l, tab)));

/** The redirect sources a city / industry slug owns (its landing under every type, 3 languages). */
export const landingSlugPaths = (slug: string): string[] => locales.flatMap((l) => FACTORY_TYPES.map((t) => typeHref(t, l, slug)));

/**
 * A new factory (or city / industry) takes a slug that an old one was renamed away from: its paths are live again,
 * so those redirect rows go — the proxy redirects before any page renders and would hide the new page.
 * Returns whether a row was removed (the caller then invalidates REDIRECTS_TAG).
 */
async function releasePaths(db: AnyPgDb, paths: string[]): Promise<boolean> {
  const gone = await db.delete(redirects).where(inArray(redirects.fromPath, paths)).returning({ from: redirects.fromPath });
  return gone.length > 0;
}

export const releaseFactorySlug = (db: AnyPgDb, slug: string) => releasePaths(db, factorySlugPaths(slug));
export const releaseLandingSlug = (db: AnyPgDb, slug: string) => releasePaths(db, landingSlugPaths(slug));

/**
 * Stores redirects and keeps every chain one hop long:
 * - a path that becomes live again (rename back B → A) stops redirecting;
 * - rows that pointed at an old path now point at its new one (A → B, then B → C: A → C);
 * - the old path itself redirects to the new one (replacing any earlier target).
 * Call it inside the transaction that changes the slug; then invalidate REDIRECTS_TAG.
 */
export async function recordRedirects(db: AnyPgDb, pairs: RedirectPair[]): Promise<void> {
  const list = pairs.filter((p) => p.from !== p.to);
  if (list.length === 0) return;
  await db.delete(redirects).where(
    inArray(
      redirects.fromPath,
      list.map((p) => p.to),
    ),
  );
  const target = sql.join(
    list.map((p) => sql`when ${p.from} then ${p.to}`),
    sql` `,
  );
  await db
    .update(redirects)
    .set({ toPath: sql`case ${redirects.toPath} ${target} end` })
    .where(
      inArray(
        redirects.toPath,
        list.map((p) => p.from),
      ),
    );
  await db
    .insert(redirects)
    .values(list.map((p) => ({ fromPath: p.from, toPath: p.to })))
    .onConflictDoUpdate({ target: redirects.fromPath, set: { toPath: sql`excluded.to_path`, createdAt: sql`now()` } });
}

/** Admin renamed a factory: all its paths (3 languages × factory URL and tabs) redirect; product pages follow by prefix. */
export const recordSlugChange = (db: AnyPgDb, oldSlug: string, newSlug: string) => recordRedirects(db, factorySlugRedirects(oldSlug, newSlug));

/** Admin changed a city or industry slug: its landings under all 6 types redirect, in 3 languages. */
export const recordLandingSlugChange = (db: AnyPgDb, oldSlug: string, newSlug: string) =>
  recordRedirects(db, landingSlugRedirects(oldSlug, newSlug));

/**
 * Paths to look up for `path`: itself, then each parent down to two segments after the language prefix.
 * A product page (`/fabrik/<old>/mehsullar/<code>-<slug>`) thus follows its factory's rename through the tab row.
 */
export function redirectCandidates(path: string): string[] {
  const segments = path.split("/").filter(Boolean);
  const prefix = segments[0] && (locales as readonly string[]).includes(segments[0]) ? 1 : 0;
  const out: string[] = [];
  for (let n = segments.length; n - prefix >= 2; n--) out.push("/" + segments.slice(0, n).join("/"));
  return out;
}

/**
 * Current path for an old one from an in-memory `from → to` map (the proxy's copy of the table). Candidates come
 * longest first, so the first hit is the longest stored prefix; the rest of the path is kept.
 */
export function lookupRedirect(map: ReadonlyMap<string, string>, path: string): string | null {
  for (const from of redirectCandidates(path)) {
    const to = map.get(from);
    // Candidates are whole-segment prefixes of the normalised path, so the rest starts with "/" (or is empty).
    if (to !== undefined) return to + normalizePath(path).slice(from.length);
  }
  return null;
}

/** Current path for an old one (the longest stored prefix wins, the rest of the path is kept), or null. */
export async function findRedirect(db: AnyPgDb, path: string): Promise<string | null> {
  const candidates = redirectCandidates(path);
  if (candidates.length === 0) return null;
  const rows = await db.select({ from: redirects.fromPath, to: redirects.toPath }).from(redirects).where(inArray(redirects.fromPath, candidates));
  return lookupRedirect(new Map(rows.map((r) => [r.from, r.to])), path);
}

const normalizePath = (path: string) => "/" + path.split("/").filter(Boolean).join("/");
