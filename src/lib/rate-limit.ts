import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";

/**
 * Atomically counts one attempt for `key` and returns true while it is within `limit`.
 * A new window starts when the previous one has passed. Uses the database clock.
 */
export async function consumeAttempt(key: string, limit: number, windowSec: number): Promise<boolean> {
  const expired = sql`${rateLimits.windowStart} < now() - make_interval(secs => ${windowSec})`;
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart: sql`now()`, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${expired} then now() else ${rateLimits.windowStart} end`,
      },
    })
    .returning({ count: rateLimits.count });
  return row.count <= limit;
}

export async function clearAttempts(key: string): Promise<void> {
  await db.delete(rateLimits).where(eq(rateLimits.key, key));
}
