// Sitemap rows for factories and products. No "server-only" / next/cache: the cached wrappers are in ./sitemap-queries.ts.
// R12: no OFFSET. Products are chunked by id range, factories by the id boundaries of a cached list: every chunk is an index range scan.
import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import { factories, products } from "@/db/schema";
import type { AnyPgDb } from "@/lib/cache/tag-store";

/** Every entity has a URL in 3 languages and the protocol allows 50 000 URLs per file: 16 666 × 3 = 49 998. */
export const SITEMAP_ENTITIES_PER_FILE = 16_666;
/** Product ids start here (schema: identity startWith). Chunk n covers ids [START + n·SPAN, START + (n+1)·SPAN), so it holds at most SPAN products. */
export const PRODUCT_ID_START = 1_000_000;

export type FactorySitemapRow = { slug: string; updatedAt: Date };
export type ProductSitemapRow = { id: number; slug: string; factorySlug: string; updatedAt: Date };

const publishedFactory = eq(factories.status, "published");
const publishedProduct = and(eq(products.status, "published"), publishedFactory);

export const filesFor = (total: number) => Math.max(1, Math.ceil(total / SITEMAP_ENTITIES_PER_FILE));

/** Number of product id-range files for the highest product id (null = no products): at least one. Gaps (deleted/unpublished) only make a file smaller. */
export const productFilesFor = (maxId: number | null) =>
  maxId === null || maxId < PRODUCT_ID_START ? 1 : Math.floor((maxId - PRODUCT_ID_START) / SITEMAP_ENTITIES_PER_FILE) + 1;

/** The product ids [from, to) of file `index`. */
export const productRange = (index: number) => ({
  from: PRODUCT_ID_START + index * SITEMAP_ENTITIES_PER_FILE,
  to: PRODUCT_ID_START + (index + 1) * SITEMAP_ENTITIES_PER_FILE,
});

/** The first factory id of every file: the ids at row 1, 16 667, … of the published factories in id order (one pass; the caller caches it). */
export async function factoryBoundaries(db: AnyPgDb): Promise<string[]> {
  const rows = await db.execute<{ id: string }>(sql`
    select id from (
      select id, row_number() over (order by id) as rn from ${factories} where ${factories.status} = 'published'
    ) t where (rn - 1) % ${SITEMAP_ENTITIES_PER_FILE} = 0 order by id`);
  return (rows as unknown as { id: string }[]).map((r) => r.id);
}

export async function maxProductId(db: AnyPgDb): Promise<number | null> {
  const [row] = await db.select({ id: sql<string | null>`max(${products.id})` }).from(products);
  return row.id === null ? null : Number(row.id);
}

/** Published factories of file `index` (0-based): the id range between two boundaries, at most one file's worth, in id order. */
export async function listSitemapFactories(db: AnyPgDb, boundaries: string[], index: number): Promise<FactorySitemapRow[]> {
  const from = boundaries[index];
  if (from === undefined) return [];
  const to = boundaries[index + 1];
  return db
    .select({ slug: factories.slug, updatedAt: factories.updatedAt })
    .from(factories)
    .where(and(publishedFactory, gte(factories.id, from), to === undefined ? undefined : lt(factories.id, to)))
    .orderBy(asc(factories.id))
    .limit(SITEMAP_ENTITIES_PER_FILE);
}

/** Published products of published factories with ids in the range of file `index` (0-based), in id order. */
export async function listSitemapProducts(db: AnyPgDb, index: number): Promise<ProductSitemapRow[]> {
  const { from, to } = productRange(index);
  return db
    .select({ id: products.id, slug: products.slug, factorySlug: factories.slug, updatedAt: products.updatedAt })
    .from(products)
    .innerJoin(factories, eq(factories.id, products.factoryId))
    .where(and(publishedProduct, gte(products.id, from), lt(products.id, to)))
    .orderBy(asc(products.id));
}
