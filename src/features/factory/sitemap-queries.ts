import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { FACTORIES_TAG } from "@/lib/cache/tags";
import {
  countSitemapFactories,
  countSitemapProducts,
  filesFor,
  listSitemapFactories,
  listSitemapProducts,
  type FactorySitemapRow,
  type ProductSitemapRow,
} from "./sitemap-sql";

// `hours`: a product write invalidates its own factory's tag only, so the product sitemap may lag up to an hour;
// factory writes (create, publish, rename) drop both at once through FACTORIES_TAG.

/** How many factory sitemap files there are (at least one). */
export async function getFactorySitemapFiles(): Promise<number> {
  "use cache";
  cacheLife("hours");
  cacheTag(FACTORIES_TAG);
  return filesFor(await countSitemapFactories(db));
}

export async function getFactorySitemapRows(index: number): Promise<FactorySitemapRow[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(FACTORIES_TAG);
  return listSitemapFactories(db, index);
}

export async function getProductSitemapFiles(): Promise<number> {
  "use cache";
  cacheLife("hours");
  cacheTag(FACTORIES_TAG);
  return filesFor(await countSitemapProducts(db));
}

export async function getProductSitemapRows(index: number): Promise<ProductSitemapRow[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(FACTORIES_TAG);
  return listSitemapProducts(db, index);
}
