// In-process positive cache for the proxy's product check (R9): code → the product's current slugs. A canonical product
// view then costs no database query. Pure (no server imports), unit-tested with a fake clock and version.

export type ProductSlugs = { factorySlug: string; productSlug: string };

type Options = {
  max?: number;
  ttlMs?: number;
  now?: () => number;
  /** Last invalidation time (ms) of FACTORIES_TAG / REDIRECTS_TAG in this process, 0 when never; a change clears the cache. */
  version: () => number;
};

export class ProductSlugCache {
  private readonly entries = new Map<number, { value: ProductSlugs; expires: number }>();
  private seen: number;
  private readonly max: number;
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(private readonly opts: Options) {
    this.max = opts.max ?? 10_000;
    this.ttlMs = opts.ttlMs ?? 60_000;
    this.now = opts.now ?? Date.now;
    this.seen = opts.version();
  }

  private sync(): void {
    const v = this.opts.version();
    if (v !== this.seen) {
      this.seen = v;
      this.entries.clear();
    }
  }

  get size(): number {
    return this.entries.size;
  }

  /** The tag version to remember before a database lookup; pass it to `set` so a lookup that raced an invalidation is dropped. */
  snapshot(): number {
    this.sync();
    return this.seen;
  }

  get(code: number): ProductSlugs | undefined {
    this.sync();
    const hit = this.entries.get(code);
    if (!hit) return undefined;
    if (hit.expires <= this.now()) {
      this.entries.delete(code);
      return undefined;
    }
    // Map keeps insertion order: re-insert to mark as most recently used.
    this.entries.delete(code);
    this.entries.set(code, hit);
    return hit.value;
  }

  set(code: number, value: ProductSlugs, snapshot: number): void {
    this.sync();
    if (snapshot !== this.seen) return;
    this.entries.delete(code);
    this.entries.set(code, { value, expires: this.now() + this.ttlMs });
    if (this.entries.size > this.max) this.entries.delete(this.entries.keys().next().value as number);
  }
}
