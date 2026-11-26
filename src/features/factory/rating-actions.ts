"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { clientIpHash } from "@/lib/client-ip";
import { factoryTag, invalidateTags } from "@/lib/cache/tags";
import { consumeAttempt } from "@/lib/rate-limit";
import { RATING_LIMIT, RATING_WINDOW_SEC, VOTER_COOKIE, VOTER_COOKIE_MAX_AGE, isVoterId, scoreSchema, voterHash } from "./rating";
import { castVote, findVote } from "./rating-sql";

export type RateResult = { ok: true } | { ok: false; error: "invalid" | "rateLimited" | "ipLimit" | "notFound" | "server" };

/**
 * Anonymous vote for a published factory: one per voter (cookie id + hashed IP), changeable (upsert). 20 per IP per hour; at most 3 distinct voters per IP per factory in 30 days.
 * The factory page's tag is refreshed at once; catalog cards may lag up to an hour (decision).
 */
export async function rateFactory(slug: string, score: number): Promise<RateResult> {
  const parsed = scoreSchema.safeParse(score);
  if (!parsed.success || typeof slug !== "string" || slug.length > 200) return { ok: false, error: "invalid" };
  try {
    const ipHash = await clientIpHash();
    if (!(await consumeAttempt(`rate:${ipHash}`, RATING_LIMIT, RATING_WINDOW_SEC))) return { ok: false, error: "rateLimited" };
    const store = await cookies();
    let voterId = store.get(VOTER_COOKIE)?.value;
    if (!isVoterId(voterId)) {
      voterId = randomUUID();
      store.set(VOTER_COOKIE, voterId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: VOTER_COOKIE_MAX_AGE });
    }
    const result = await castVote(db, slug, voterHash(voterId, ipHash), parsed.data, ipHash);
    if (result === "ipLimit") return { ok: false, error: "ipLimit" };
    if (!result) return { ok: false, error: "notFound" };
    await invalidateTags([factoryTag(result.factoryId)]);
    return { ok: true };
  } catch (error) {
    console.error("rating: vote failed", error);
    return { ok: false, error: "server" };
  }
}

/** The visitor's earlier score (to preselect in the modal), or null. Read on demand, never part of the cached page. */
export async function myRating(slug: string): Promise<number | null> {
  try {
    const voterId = (await cookies()).get(VOTER_COOKIE)?.value;
    if (!isVoterId(voterId) || typeof slug !== "string" || slug.length > 200) return null;
    return await findVote(db, slug, voterHash(voterId, await clientIpHash()));
  } catch (error) {
    console.error("rating: could not read the earlier vote", error);
    return null;
  }
}
