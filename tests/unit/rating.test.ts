import { test } from "node:test";
import assert from "node:assert/strict";
import { isVoterId, ratingStats, scoreSchema, voterHash } from "../../src/features/factory/rating.ts";

test("ratingStats: orta 2 onluq işarəyə yuvarlaqlanır, səs yoxdursa 0", () => {
  assert.deepEqual(ratingStats(0, 0), { avg: 0, count: 0 });
  assert.deepEqual(ratingStats(5, 1), { avg: 5, count: 1 });
  assert.deepEqual(ratingStats(10, 3), { avg: 3.33, count: 3 });
  assert.deepEqual(ratingStats(11, 3), { avg: 3.67, count: 3 });
  assert.deepEqual(ratingStats(4 + 5 + 5, 3), { avg: 4.67, count: 3 });
});

test("voterHash: sabitdir, hex sha256, cookie və ya IP dəyişəndə dəyişir", () => {
  const a = voterHash("11111111-1111-4111-8111-111111111111", "ip1");
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.equal(a, voterHash("11111111-1111-4111-8111-111111111111", "ip1"));
  assert.notEqual(a, voterHash("22222222-2222-4222-8222-222222222222", "ip1"));
  assert.notEqual(a, voterHash("11111111-1111-4111-8111-111111111111", "ip2"));
  // The separator keeps ("ab", "c") apart from ("a", "bc").
  assert.notEqual(voterHash("ab", "c"), voterHash("a", "bc"));
});

test("scoreSchema yalnız 1–5 tam ədədləri qəbul edir", () => {
  for (const ok of [1, 2, 3, 4, 5]) assert.equal(scoreSchema.safeParse(ok).success, true);
  for (const bad of [0, 6, -1, 2.5, "3", null, NaN]) assert.equal(scoreSchema.safeParse(bad).success, false);
});

test("isVoterId: yalnız uuid", () => {
  assert.equal(isVoterId("11111111-1111-4111-8111-111111111111"), true);
  assert.equal(isVoterId("abc"), false);
  assert.equal(isVoterId(undefined), false);
});
