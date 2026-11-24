import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { FACTORIES_TAG, factoryTag, REDIRECTS_TAG } from "@/lib/cache/tags";
import { findFactoryBySlug, findProduct, listFactoryProducts, listFactoryVacancies, listSimilarProducts } from "./factory-sql";
import { findRedirect } from "./slug-redirect";
import { PRODUCTS_PAGE_SIZE, SIMILAR_PRODUCTS, VACANCIES_PAGE_SIZE, type FactoryPage, type Paged, type ProductCard, type ProductPage, type VacancyCard } from "./types";

export type { FactoryPage, MediaImage, Paged, ProductCard, ProductPage, VacancyCard } from "./types";

/**
 * Public factory page data: published factories only (draft and hidden → null, i.e. 404).
 * Tagged with the factory's own tag (admin writes and rating votes refresh just this page); an unknown slug is tagged
 * FACTORIES_TAG, which every create / rename / status change invalidates, so a new slug shows up at once.
 */
export async function getFactoryBySlug(slug: string): Promise<FactoryPage | null> {
  "use cache";
  cacheLife("max");
  const factory = await findFactoryBySlug(db, slug);
  if (!factory) {
    cacheTag(FACTORIES_TAG);
    return null;
  }
  cacheTag(factoryTag(factory.id));
  return factory.status === "published" ? factory : null;
}

/** Admin "Önizlə" (`?preview=1` with an admin session — the caller checks it): any status, never cached. */
export const getFactoryPreview = (slug: string): Promise<FactoryPage | null> => findFactoryBySlug(db, slug);

export async function getFactoryProducts(factoryId: string, page: number): Promise<Paged<ProductCard>> {
  "use cache";
  cacheLife("max");
  cacheTag(factoryTag(factoryId));
  return listFactoryProducts(db, factoryId, page, PRODUCTS_PAGE_SIZE);
}

/** A published product of this factory by code; null when hidden, draft or another factory's. */
export async function getProduct(factoryId: string, code: number): Promise<ProductPage | null> {
  "use cache";
  cacheLife("max");
  cacheTag(factoryTag(factoryId));
  return findProduct(db, factoryId, code);
}

/** "Oxşar məhsullar": the factory's 6 newest other products. */
export async function getSimilarProducts(factoryId: string, code: number): Promise<ProductCard[]> {
  "use cache";
  cacheLife("max");
  cacheTag(factoryTag(factoryId));
  return listSimilarProducts(db, factoryId, code, SIMILAR_PRODUCTS);
}

/** Open vacancies; `hours` so one past its end date drops off within the hour without any write. */
export async function getFactoryVacancies(factoryId: string, page: number): Promise<Paged<VacancyCard>> {
  "use cache";
  cacheLife("hours");
  cacheTag(factoryTag(factoryId));
  return listFactoryVacancies(db, factoryId, page, VACANCIES_PAGE_SIZE);
}

/**
 * Where an old public path lives now (slug renamed), or null. Pages call it only when the slug is not found.
 * Cached per path; REDIRECTS_TAG is invalidated after every recordSlugChange / recordLandingSlugChange.
 */
export async function resolveRedirect(path: string): Promise<string | null> {
  "use cache";
  cacheLife("max");
  cacheTag(REDIRECTS_TAG);
  return findRedirect(db, path);
}
