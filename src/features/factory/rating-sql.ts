// Rating queries. No "server-only" and no next/cache: the action and the DB tests share them.
import { and, eq, sql } from "drizzle-orm";
import { factories, ratings } from "@/db/schema";
import type { AnyPgDb } from "@/lib/cache/tag-store";
import { ratingStats } from "./rating";

export type VoteResult = { factoryId: string; avg: number; count: number };

/**
 * Saves (or changes) a voter's score for a published factory and recomputes the factory's average and count from
 * `ratings`, in one transaction. The factory row is locked first, so two votes for the same factory never overwrite
 * each other's aggregate. `null` = no such published factory.
 */
export async function castVote(db: AnyPgDb, slug: string, hash: string, score: number): Promise<VoteResult | null> {
  return db.transaction(async (tx) => {
    const [factory] = await tx
      .select({ id: factories.id })
      .from(factories)
      .where(and(eq(factories.slug, slug), eq(factories.status, "published")))
      .for("update");
    if (!factory) return null;
    await tx
      .insert(ratings)
      .values({ factoryId: factory.id, voterHash: hash, score })
      .onConflictDoUpdate({ target: [ratings.factoryId, ratings.voterHash], set: { score, updatedAt: sql`now()` } });
    const [agg] = await tx
      .select({ sum: sql<number>`coalesce(sum(${ratings.score}), 0)::int`, count: sql<number>`count(*)::int` })
      .from(ratings)
      .where(eq(ratings.factoryId, factory.id));
    const stats = ratingStats(agg.sum, agg.count);
    await tx.update(factories).set({ ratingAvg: stats.avg, ratingCount: stats.count }).where(eq(factories.id, factory.id));
    return { factoryId: factory.id, ...stats };
  });
}

/** The voter's current score for a published factory, or null. */
export async function findVote(db: AnyPgDb, slug: string, hash: string): Promise<number | null> {
  const [row] = await db
    .select({ score: ratings.score })
    .from(ratings)
    .innerJoin(factories, eq(factories.id, ratings.factoryId))
    .where(and(eq(factories.slug, slug), eq(factories.status, "published"), eq(ratings.voterHash, hash)))
    .limit(1);
  return row?.score ?? null;
}
