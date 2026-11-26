import { test } from "node:test";
import assert from "node:assert/strict";
import { RedirectMapCache } from "../../src/features/factory/redirect-map.ts";

const flush = () => new Promise((r) => setTimeout(r, 0));

function setup(opts: { rows?: [string, string][][]; fail?: boolean[]; hang?: boolean[]; release?: (() => void)[] } = {}) {
  let now = 1_000;
  let version = 0;
  let calls = 0;
  const batches = opts.rows ?? [[["/fabrik/a", "/fabrik/b"]]];
  const cache = new RedirectMapCache({
    load: async () => {
      const i = calls++;
      if (opts.fail?.[i]) throw new Error("db down");
      if (opts.hang?.[i]) await new Promise<void>((r) => opts.release?.push(r));
      return batches[Math.min(i, batches.length - 1)];
    },
    version: () => version,
    now: () => now,
    ttlMs: 60_000,
    retryMs: 5_000,
    timeoutMs: 30,
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

test("after 60 s the old map is served at once and refreshed in the background (stale-while-revalidate)", async () => {
  const s = setup({ rows: [[["/fabrik/a", "/fabrik/b"]], [["/fabrik/a", "/fabrik/c"]]] });
  await s.cache.lookup("/fabrik/a");
  s.tick(60_001);
  assert.equal(await s.cache.lookup("/fabrik/a"), "/fabrik/b");
  await flush();
  assert.equal(s.calls, 2);
  assert.equal(await s.cache.lookup("/fabrik/a"), "/fabrik/c");
  assert.equal(s.calls, 2);
});

test("reloads as soon as REDIRECTS_TAG was invalidated after the last load", async () => {
  const s = setup({ rows: [[], [["/fabrik/a", "/fabrik/b"]]] });
  assert.equal(await s.cache.lookup("/fabrik/a"), null);
  s.tick(10);
  s.bump();
  assert.equal(await s.cache.lookup("/fabrik/a"), null); // the old map answers while the refresh runs
  await flush();
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
  await flush();
  s.tick(1_000);
  assert.equal(await s.cache.lookup("/fabrik/a"), "/fabrik/b");
  assert.equal(s.calls, 2);
  s.tick(5_000);
  assert.equal(await s.cache.lookup("/fabrik/a"), "/fabrik/b"); // served stale, refresh in the background
  await flush();
  assert.equal(await s.cache.lookup("/fabrik/a"), "/fabrik/d");
});

test("a failed first load answers null (pages render normally) and retries later", async () => {
  const s = setup({ fail: [true] });
  assert.equal(await s.cache.lookup("/fabrik/a"), null);
  s.tick(5_001);
  assert.equal(await s.cache.lookup("/fabrik/a"), "/fabrik/b");
});

test("cold start with a hung database: waits at most the timeout, fails open, and uses the late result", async () => {
  const release: (() => void)[] = [];
  const s = setup({ hang: [true], release });
  const started = Date.now();
  assert.equal(await s.cache.lookup("/fabrik/a"), null);
  assert.ok(Date.now() - started < 1_000, "the request must not wait for the database");
  assert.equal(s.calls, 1);
  // Within the retry window no new load starts; the first one keeps running in the background.
  assert.equal(await s.cache.lookup("/fabrik/a"), null);
  assert.equal(s.calls, 1);
  release[0]();
  await flush();
  assert.equal(await s.cache.lookup("/fabrik/a"), "/fabrik/b");
});

test("a hung background refresh never blocks a request: the old map keeps answering", async () => {
  const release: (() => void)[] = [];
  const s = setup({ rows: [[["/fabrik/a", "/fabrik/b"]], [["/fabrik/a", "/fabrik/c"]]], hang: [false, true], release });
  await s.cache.lookup("/fabrik/a");
  s.tick(60_001);
  const started = Date.now();
  assert.equal(await s.cache.lookup("/fabrik/a"), "/fabrik/b");
  assert.equal(await s.cache.lookup("/fabrik/a"), "/fabrik/b");
  assert.ok(Date.now() - started < 1_000);
  assert.equal(s.calls, 2); // one shared refresh
  await new Promise((r) => setTimeout(r, 60)); // the 30 ms timeout passes
  assert.equal(await s.cache.lookup("/fabrik/a"), "/fabrik/b");
  assert.equal(s.calls, 2); // retry window: not hammering the database
});
