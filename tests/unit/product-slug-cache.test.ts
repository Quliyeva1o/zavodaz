import { test } from "node:test";
import assert from "node:assert/strict";
import { ProductSlugCache } from "../../src/features/factory/product-slug-cache.ts";

function setup(max = 3) {
  let now = 1_000;
  let version = 0;
  const cache = new ProductSlugCache({ max, ttlMs: 60_000, now: () => now, version: () => version });
  return {
    cache,
    advance: (ms: number) => (now += ms),
    bump: () => (version = now + 1),
  };
}

const v = (p: string) => ({ factorySlug: "f", productSlug: p });

test("saxlanan dəyər qaytarılır, naməlum açar undefined", () => {
  const { cache } = setup();
  assert.equal(cache.get(1), undefined);
  cache.set(1, v("a"), cache.snapshot());
  assert.deepEqual(cache.get(1), v("a"));
});

test("TTL bitəndə silinir", () => {
  const { cache, advance } = setup();
  cache.set(1, v("a"), cache.snapshot());
  advance(59_999);
  assert.ok(cache.get(1));
  advance(2);
  assert.equal(cache.get(1), undefined);
});

test("limit aşılanda ən az işlənən çıxarılır (LRU)", () => {
  const { cache } = setup(3);
  for (const k of [1, 2, 3]) cache.set(k, v(String(k)), cache.snapshot());
  cache.get(1); // 1 təzədir, 2 ən köhnədir
  cache.set(4, v("4"), cache.snapshot());
  assert.equal(cache.get(2), undefined);
  assert.ok(cache.get(1) && cache.get(3) && cache.get(4));
  assert.equal(cache.size, 3);
});

test("teq dəyişəndə hamısı təmizlənir", () => {
  const { cache, bump } = setup();
  cache.set(1, v("a"), cache.snapshot());
  bump();
  assert.equal(cache.get(1), undefined);
  assert.equal(cache.size, 0);
});

test("sorğu gedərkən teq dəyişibsə nəticə yazılmır", () => {
  const { cache, bump } = setup();
  const snap = cache.snapshot();
  bump();
  cache.set(1, v("a"), snap);
  assert.equal(cache.get(1), undefined);
});
