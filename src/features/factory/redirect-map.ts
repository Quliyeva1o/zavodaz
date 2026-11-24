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
  log?: (message: string, error: unknown) => void;
};

/**
 * The map is loaded on the first lookup and reloaded when REDIRECTS_TAG was invalidated after the last load, or after
 * `ttlMs`. A lookup is a few Map.get calls (one per path segment): no database query per request. Concurrent lookups
 * share one load; a failing database never breaks a page (the old map, or none, stays in use until the retry).
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
  private readonly log: (message: string, error: unknown) => void;

  constructor(private readonly opts: Options) {
    this.now = opts.now ?? Date.now;
    this.ttlMs = opts.ttlMs ?? 60_000;
    this.retryMs = opts.retryMs ?? 5_000;
    this.log = opts.log ?? ((message, error) => console.error(message, error));
  }

  private stale(): boolean {
    const now = this.now();
    if (now < this.retryAt) return false;
    return !this.loaded || now - this.loadedAt >= this.ttlMs || this.opts.version() > this.loadedAt;
  }

  private reload(): Promise<void> {
    this.loading ??= (async () => {
      const startedAt = this.now();
      try {
        const rows = await this.opts.load();
        this.map = new Map(rows);
        // The writer records the invalidation after its commit, so a query started at or after that time saw the write.
        this.loadedAt = startedAt;
        this.loaded = true;
        this.retryAt = 0;
      } catch (error) {
        this.retryAt = this.now() + this.retryMs;
        this.log("redirects: could not load the redirect map", error);
      } finally {
        this.loading = null;
      }
    })();
    return this.loading;
  }

  /** The current path for an old public path, or null. Never throws. */
  async lookup(path: string): Promise<string | null> {
    if (this.stale()) await this.reload();
    return lookupRedirect(this.map, path);
  }
}
