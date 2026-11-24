import { test } from "node:test";
import assert from "node:assert/strict";
import { RedirectMapCache } from "../../src/features/factory/redirect-map.ts";

function setup(opts: { rows?: [string, string][][]; fail?: boolean[] } = {}) {
  let now = 1_000;
  let version = 0;
  let calls = 0;
  const batches = opts.rows ?? [[["/fabrik/a", "/fabrik/b"]]];
  const cache = new RedirectMapCache({
    load: async () => {
      const i = calls++;
      if (opts.fail?.[i]) throw new Error("db down");
      return batches[Math.min(i, batches.length - 1)];
    },
    version: () => version,
    now: () => now,
    ttlMs: 60_000,
    retryMs: 5_000,
    log: () => {},
  });
  return {
    cache,
    get calls() {
      return calls;
    },
    tick: (ms: number) => (now += ms),
    bump: () => (version = now),
  };
}

test("loads lazily on the first lookup, then answers from memory (no load per request)", async () => {
  const s = setup();
  assert.equal(s.calls, 0);
  assert.equal(await s.cache.lookup("/fabrik/a/media"), "/fabrik/b/media");
  assert.equal(await s.cache.lookup("/fabrik/x"), null);
  s.tick(59_000);
  assert.equal(await s.cache.lookup("/fabrik/a"), "/fabrik/b");
  assert.equal(s.calls, 1);
});

test("concurrent first lookups share one load", async () => {
  const s = setup();
  const all = await Promise.all([s.cache.lookup("/fabrik/a"), s.cache.lookup("/fabrik/a"), s.cache.lookup("/fabrik/a")]);
  assert.deepEqual(all, ["/fabrik/b", "/fabrik/b", "/fabrik/b"]);
  assert.equal(s.calls, 1);
});

test("reloads after 60 s", async () => {
  const s = setup({ rows: [[["/fabrik/a", "/fabrik/b"]], [["/fabrik/a", "/fabrik/c"]]] });
  await s.cache.lookup("/fabrik/a");
  s.tick(60_001);
  assert.equal(await s.cache.lookup("/fabrik/a"), "/fabrik/c");
  assert.equal(s.calls, 2);
});

test("reloads as soon as REDIRECTS_TAG was invalidated after the last load", async () => {
  const s = setup({ rows: [[], [["/fabrik/a", "/fabrik/b"]]] });
  assert.equal(await s.cache.lookup("/fabrik/a"), null);
  s.tick(10);
  s.bump();
  assert.equal(await s.cache.lookup("/fabrik/a"), "/fabrik/b");
  assert.equal(s.calls, 2);
  assert.equal(await s.cache.lookup("/fabrik/a"), "/fabrik/b");
  assert.equal(s.calls, 2);
});

test("a failed load keeps the previous map and retries after retryMs; never throws", async () => {
  const s = setup({ rows: [[["/fabrik/a", "/fabrik/b"]], [], [["/fabrik/a", "/fabrik/d"]]], fail: [false, true] });
  await s.cache.lookup("/fabrik/a");
  s.tick(60_001);
  assert.equal(await s.cache.lookup("/fabrik/a"), "/fabrik/b");
  s.tick(1_000);
  assert.equal(await s.cache.lookup("/fabrik/a"), "/fabrik/b");
  assert.equal(s.calls, 2);
  s.tick(5_000);
  assert.equal(await s.cache.lookup("/fabrik/a"), "/fabrik/d");
});

test("a failed first load answers null (pages render normally) and retries later", async () => {
  const s = setup({ fail: [true] });
  assert.equal(await s.cache.lookup("/fabrik/a"), null);
  s.tick(5_001);
  assert.equal(await s.cache.lookup("/fabrik/a"), "/fabrik/b");
});
