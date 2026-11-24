// Factory rating rules with no server imports (unit-tested, shared by the action and the DB helpers).
import { createHash } from "node:crypto";
import { z } from "zod";

/** Anonymous voter id: httpOnly cookie, a UUID, one year. */
export const VOTER_COOKIE = "zv_voter";
export const VOTER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
/** Votes per IP per hour (changing a vote counts too). */
export const RATING_LIMIT = 20;
export const RATING_WINDOW_SEC = 60 * 60;

export const scoreSchema = z.number().int().min(1).max(5);
export const isVoterId = (value: string | undefined): value is string => z.uuid().safeParse(value).success;

/** One vote per voter per factory: the voter is the cookie id together with the hashed IP (brief: sha256(anon_cookie_id + ip_hash)). */
export function voterHash(voterId: string, ipHash: string): string {
  return createHash("sha256").update(`${voterId}:${ipHash}`).digest("hex");
}

/** The stored average (two decimals, 0 without votes) from the score sum and vote count. */
export function ratingStats(sum: number, count: number): { avg: number; count: number } {
  if (count <= 0) return { avg: 0, count: 0 };
  return { avg: Math.round((sum / count) * 100) / 100, count };
}
