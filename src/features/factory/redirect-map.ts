// In-memory copy of the `redirects` table for the proxy (R2: a real 301 needs the redirect before the page streams).
// No server / Next imports: unit-tested with a fake loader and clock (tests/unit/redirect-map.test.ts).
import { lookupRedirect } from "./slug-redirect";

type Options = {
  /** All rows as `[from, to]` (one small query; the table holds 15 rows per renamed factory). */
  load: () => Promise<Iterable<[string, string]>>;
  /** Last invalidation time of REDIRECTS_TAG in this process (ms), 0 when never. */
  version: () => number;
  now?: () => number;
  /** Safety net: reload at least this often even without an invalidation (another process may have missed one). */
  ttlMs?: number;
  /** After a failed load, keep the old map and try again after this long. */
  retryMs?: number;
  /** A load that takes longer counts as failed (its late result is still used); also the longest a cold start waits. */
  timeoutMs?: number;
  log?: (message: string, error: unknown) => void;
};

/**
 * The map is loaded on the first lookup and reloaded when REDIRECTS_TAG was invalidated after the last load, or after
 * `ttlMs`. A lookup is a few Map.get calls (one per path segment): no database query per request. Concurrent lookups
 * share one load. A request never waits on a slow database (R8):
 * - stale-while-revalidate: once a map exists, an expired one is served at once and refreshed in the background;
 * - cold start: wait at most `timeoutMs`, then answer "no redirect" (fail open); the load keeps running and its result
 *   is used by the next request;
 * - a failing or hung database keeps the old map (or none) in use until the retry.
 */
export class RedirectMapCache {
  private map: ReadonlyMap<string, string> = new Map();
  private loaded = false;
  /** When the current map's query started (ms): a write recorded later is not in it. */
  private loadedAt = 0;
  /** Do not try again before this time (ms), after a failure. */
  private retryAt = 0;
  private loading: Promise<void> | null = null;
  private readonly now: () => number;
  private readonly ttlMs: number;
  private readonly retryMs: number;
  private readonly timeoutMs: number;
  private readonly log: (message: string, error: unknown) => void;

  constructor(private readonly opts: Options) {
    this.now = opts.now ?? Date.now;
    this.ttlMs = opts.ttlMs ?? 60_000;
    this.retryMs = opts.retryMs ?? 5_000;
    this.timeoutMs = opts.timeoutMs ?? 1_500;
    this.log = opts.log ?? ((message, error) => console.error(message, error));
  }

  private stale(): boolean {
    const now = this.now();
    if (now < this.retryAt) return false;
    return !this.loaded || now - this.loadedAt >= this.ttlMs || this.opts.version() > this.loadedAt;
  }

  /** Starts (or joins) a load. The returned promise never rejects and settles after at most `timeoutMs`. */
  private reload(): Promise<void> {
    if (this.loading) return this.loading;
    const startedAt = this.now();
    const attempt = Promise.resolve().then(() => this.opts.load());
    this.loading = new Promise<void>((resolve) => {
      let settled = false;
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) {
          this.retryAt = this.now() + this.retryMs;
          this.log("redirects: could not load the redirect map", error);
        }
        this.loading = null;
        resolve();
      };
      const timer = setTimeout(() => finish(new Error(`timed out after ${this.timeoutMs} ms`)), this.timeoutMs);
      timer.unref?.();
      attempt.then(
        (rows) => {
          // A late result (after the timeout) is still good, unless a newer load already replaced it.
          if (startedAt >= this.loadedAt) {
            this.map = new Map(rows);
            // The writer records the invalidation after its commit, so a query started at or after that time saw the write.
            this.loadedAt = startedAt;
            this.loaded = true;
            this.retryAt = 0;
          }
          finish();
        },
        (error) => finish(error ?? new Error("load failed")),
      );
    });
    return this.loading;
  }

  /** The current path for an old public path, or null. Never throws and never waits longer than `timeoutMs`. */
  async lookup(path: string): Promise<string | null> {
    if (this.stale()) {
      const loading = this.reload();
      if (!this.loaded) await loading;
    }
    return lookupRedirect(this.map, path);
  }
}
