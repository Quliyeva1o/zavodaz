import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";

/** True when `key` already has `limit` attempts inside the current window. */
export async function isRateLimited(key: string, limit: number, windowSec: number): Promise<boolean> {
  const [row] = await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1);
  if (!row) return false;
  if (Date.now() - row.windowStart.getTime() > windowSec * 1000) return false;
  return row.count >= limit;
}

/** Counts one attempt; a new window starts when the previous one has passed. */
export async function recordAttempt(key: string, windowSec: number): Promise<void> {
  const expired = sql`${rateLimits.windowStart} < now() - make_interval(secs => ${windowSec})`;
  await db
    .insert(rateLimits)
    .values({ key, windowStart: new Date(), count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${expired} then now() else ${rateLimits.windowStart} end`,
      },
    });
}

export async function clearAttempts(key: string): Promise<void> {
  await db.delete(rateLimits).where(eq(rateLimits.key, key));
}
