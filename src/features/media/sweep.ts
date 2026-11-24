// Deleting unreferenced images. No "server-only": the admin (via store.ts) and the cron script (scripts/media) share it.
import { rm } from "node:fs/promises";
import path from "node:path";
import { and, asc, eq, lt, sql, type SQL } from "drizzle-orm";
import { factories, factoryCertificates, factoryFiles, factoryImages, media, productImages } from "@/db/schema";
import type { AnyPgDb } from "@/lib/cache/tag-store";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "Nothing references media row `mediaId`". Every column that points at `media` belongs here — add new ones.
 * The subquery names its columns itself: drizzle leaves them unqualified in a one-table statement.
 */
const unreferenced = (mediaId: SQL) => sql`not exists (select 1 from ${factories} f where f.cover_id = ${mediaId} or f.logo_id = ${mediaId})
  and not exists (select 1 from ${factoryImages} r where r.media_id = ${mediaId})
  and not exists (select 1 from ${factoryCertificates} r where r.media_id = ${mediaId})
  and not exists (select 1 from ${factoryFiles} r where r.media_id = ${mediaId})
  and not exists (select 1 from ${productImages} r where r.media_id = ${mediaId})`;
const mediaIdColumn = sql`${media}.${sql.identifier("id")}`;

/**
 * Deletes an upload, image or PDF (its `media` row and `<uploadDir>/<id>/`), unless something references it.
 * One statement checks and deletes, so a reference saved meanwhile keeps the row. Returns whether it was deleted.
 */
export async function deleteUnreferencedMedia(db: AnyPgDb, uploadDir: string, id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const deleted = await db
    .delete(media)
    .where(and(eq(media.id, id), unreferenced(mediaIdColumn)))
    .returning({ id: media.id });
  if (deleted.length === 0) return false;
  await rm(path.join(uploadDir, id), { recursive: true, force: true });
  return true;
}

/**
 * Deletes uploads nobody uses that are older than `olderThanMs` (default 24 h): files uploaded from an admin
 * form that was then abandoned, and the gallery of a deleted factory or product. Returns how many were deleted. Run daily from cron (`npm run media:sweep`).
 */
export async function sweepOrphanMedia(
  db: AnyPgDb,
  uploadDir: string,
  { olderThanMs = DAY_MS, now = new Date(), batch = 500 }: { olderThanMs?: number; now?: Date; batch?: number } = {},
): Promise<number> {
  const cutoff = new Date(now.getTime() - olderThanMs);
  const candidates = await db
    .select({ id: media.id })
    .from(media)
    .where(and(lt(media.createdAt, cutoff), unreferenced(mediaIdColumn)))
    .orderBy(asc(media.createdAt))
    .limit(batch);
  let deleted = 0;
  for (const { id } of candidates) if (await deleteUnreferencedMedia(db, uploadDir, id)) deleted++;
  return deleted;
}
