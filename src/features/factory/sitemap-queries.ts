import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { FACTORIES_TAG } from "@/lib/cache/tags";
import { factoryBoundaries, listSitemapFactories, listSitemapProducts, maxProductId, productFilesFor, type FactorySitemapRow, type ProductSitemapRow } from "./sitemap-sql";

// `hours`: a product write invalidates its own factory's tag only, so the product sitemap may lag up to an hour;
// factory writes (create, publish, rename) drop both at once through FACTORIES_TAG.

/** The first factory id of every file (cached; the chunk queries are id range scans, never OFFSET). */
async function getFactoryBoundaries(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(FACTORIES_TAG);
  return factoryBoundaries(db);
}

/** How many factory sitemap files there are (at least one). */
export async function getFactorySitemapFiles(): Promise<number> {
  return Math.max(1, (await getFactoryBoundaries()).length);
}

export async function getFactorySitemapRows(index: number): Promise<FactorySitemapRow[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(FACTORIES_TAG);
  return listSitemapFactories(db, await getFactoryBoundaries(), index);
}

/** How many product sitemap files there are: id ranges up to the highest product id (at least one). */
export async function getProductSitemapFiles(): Promise<number> {
  "use cache";
  cacheLife("hours");
  cacheTag(FACTORIES_TAG);
  return productFilesFor(await maxProductId(db));
}

export async function getProductSitemapRows(index: number): Promise<ProductSitemapRow[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(FACTORIES_TAG);
  return listSitemapProducts(db, index);
}
