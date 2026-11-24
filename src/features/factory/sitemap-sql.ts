// Sitemap rows for factories and products. No "server-only" / next/cache: the cached wrappers are in ./sitemap-queries.ts.
import { and, asc, count, eq } from "drizzle-orm";
import { factories, products } from "@/db/schema";
import type { AnyPgDb } from "@/lib/cache/tag-store";

/** Every entity has a URL in 3 languages and the protocol allows 50 000 URLs per file: 16 666 × 3 = 49 998. */
export const SITEMAP_ENTITIES_PER_FILE = 16_666;

export type FactorySitemapRow = { slug: string; updatedAt: Date };
export type ProductSitemapRow = { id: number; slug: string; factorySlug: string; updatedAt: Date };

const publishedFactory = eq(factories.status, "published");
const publishedProduct = and(eq(products.status, "published"), publishedFactory);

export const filesFor = (total: number) => Math.max(1, Math.ceil(total / SITEMAP_ENTITIES_PER_FILE));

export async function countSitemapFactories(db: AnyPgDb): Promise<number> {
  const [row] = await db.select({ n: count() }).from(factories).where(publishedFactory);
  return row.n;
}

export async function countSitemapProducts(db: AnyPgDb): Promise<number> {
  const [row] = await db.select({ n: count() }).from(products).innerJoin(factories, eq(factories.id, products.factoryId)).where(publishedProduct);
  return row.n;
}

/** Published factories, file `index` (0-based), stable order by id. */
export async function listSitemapFactories(db: AnyPgDb, index: number): Promise<FactorySitemapRow[]> {
  return db
    .select({ slug: factories.slug, updatedAt: factories.updatedAt })
    .from(factories)
    .where(publishedFactory)
    .orderBy(asc(factories.id))
    .limit(SITEMAP_ENTITIES_PER_FILE)
    .offset(index * SITEMAP_ENTITIES_PER_FILE);
}

/** Published products of published factories, file `index` (0-based), stable order by id. */
export async function listSitemapProducts(db: AnyPgDb, index: number): Promise<ProductSitemapRow[]> {
  return db
    .select({ id: products.id, slug: products.slug, factorySlug: factories.slug, updatedAt: products.updatedAt })
    .from(products)
    .innerJoin(factories, eq(factories.id, products.factoryId))
    .where(publishedProduct)
    .orderBy(asc(products.id))
    .limit(SITEMAP_ENTITIES_PER_FILE)
    .offset(index * SITEMAP_ENTITIES_PER_FILE);
}
