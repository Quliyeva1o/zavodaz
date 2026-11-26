// Factory page queries. No "server-only" and no next/cache: the cached wrappers (./queries.ts) and the DB tests share them.
import { and, asc, count, desc, eq, gt, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { alias, type AnyPgColumn } from "drizzle-orm/pg-core";
import { factories, factoryCertificates, factoryFiles, factoryImages, media, productImages, products, vacancies } from "@/db/schema";
import type { Cooperation } from "@/features/catalog/types";
import type { AnyPgDb } from "@/lib/cache/tag-store";
import type { FactoryPage, MediaImage, Paged, ProductCard, ProductPage, VacancyCard } from "./types";

// Generic so it takes `media` and its aliases (cover, logo) alike.
const imageColumns = <T extends Record<"id" | "variants" | "blur" | "width" | "height", AnyPgColumn>>(m: T) => ({
  id: m.id as T["id"],
  variants: m.variants as T["variants"],
  blur: m.blur as T["blur"],
  width: m.width as T["width"],
  height: m.height as T["height"],
});

const pageCountOf = (total: number, size: number) => Math.ceil(total / size);
const offsetOf = (page: number, size: number) => (Math.max(1, Math.floor(page)) - 1) * size;

/**
 * The factory behind a slug, whatever its status: `null` = no such slug. The caller decides who may see a draft or
 * hidden one (public pages: published only; admin preview: any). One row query plus three small list queries.
 */
export async function findFactoryBySlug(db: AnyPgDb, slug: string): Promise<FactoryPage | null> {
  const cover = alias(media, "cover");
  const logo = alias(media, "logo");
  const [row] = await db
    .select({
      id: factories.id,
      slug: factories.slug,
      type: factories.type,
      status: factories.status,
      name: factories.name,
      legalName: factories.legalName,
      about: factories.about,
      equipmentText: factories.equipmentText,
      employeeCount: factories.employeeCount,
      capacityText: factories.capacityText,
      phone: factories.phone,
      email: factories.email,
      website: factories.website,
      address: factories.address,
      youtubeUrl: factories.youtubeUrl,
      socials: factories.socials,
      industryId: factories.industryId,
      productTypeId: factories.productTypeId,
      cityId: factories.cityId,
      productionModelIds: factories.productionModelIds,
      cooperation: factories.cooperation,
      verified: factories.verified,
      ratingAvg: factories.ratingAvg,
      ratingCount: factories.ratingCount,
      updatedAt: factories.updatedAt,
      cover: imageColumns(cover),
      logo: imageColumns(logo),
    })
    .from(factories)
    .leftJoin(cover, eq(cover.id, factories.coverId))
    .leftJoin(logo, eq(logo.id, factories.logoId))
    .where(eq(factories.slug, slug))
    .limit(1);
  if (!row) return null;

  const [images, certificates, files] = await Promise.all([
    db
      .select(imageColumns(media))
      .from(factoryImages)
      .innerJoin(media, eq(media.id, factoryImages.mediaId))
      .where(eq(factoryImages.factoryId, row.id))
      .orderBy(asc(factoryImages.sort), asc(factoryImages.mediaId)),
    db
      .select({ id: factoryCertificates.id, title: factoryCertificates.title, image: imageColumns(media) })
      .from(factoryCertificates)
      .innerJoin(media, eq(media.id, factoryCertificates.mediaId))
      .where(eq(factoryCertificates.factoryId, row.id))
      .orderBy(asc(factoryCertificates.sort), asc(factoryCertificates.id)),
    db
      .select({ id: factoryFiles.id, title: factoryFiles.title, mediaId: factoryFiles.mediaId, size: media.size })
      .from(factoryFiles)
      .innerJoin(media, eq(media.id, factoryFiles.mediaId))
      .where(eq(factoryFiles.factoryId, row.id))
      .orderBy(asc(factoryFiles.sort), asc(factoryFiles.id)),
  ]);

  return {
    ...row,
    cooperation: row.cooperation as Cooperation[],
    // drizzle returns a left-joined nested object as null when the join found nothing
    cover: row.cover,
    logo: row.logo,
    images,
    certificates,
    files,
  };
}

const publishedOf = (factoryId: string) => and(eq(products.factoryId, factoryId), eq(products.status, "published"));
// Must match products_factory_list_idx: (factory_id, status, created_at DESC NULLS FIRST, id DESC NULLS FIRST).
const newestFirst = [desc(products.createdAt), desc(products.id)];

/** First image (lowest sort) of each product, one query for the whole list. */
async function mainImages(db: AnyPgDb, ids: number[]): Promise<Map<number, MediaImage>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ productId: productImages.productId, image: imageColumns(media) })
    .from(productImages)
    .innerJoin(media, eq(media.id, productImages.mediaId))
    .where(inArray(productImages.productId, ids))
    .orderBy(asc(productImages.productId), asc(productImages.sort), asc(productImages.mediaId));
  const out = new Map<number, MediaImage>();
  for (const r of rows) if (!out.has(r.productId)) out.set(r.productId, r.image);
  return out;
}

const cardColumns = { id: products.id, slug: products.slug, name: products.name, description: products.description };

async function withMainImages(db: AnyPgDb, rows: Omit<ProductCard, "image">[]): Promise<ProductCard[]> {
  const images = await mainImages(
    db,
    rows.map((r) => r.id),
  );
  return rows.map((r) => ({ ...r, image: images.get(r.id) ?? null }));
}

/** "Məhsullar" tab: the factory's published products, newest first, 12 per page. */
export async function listFactoryProducts(db: AnyPgDb, factoryId: string, page: number, size: number): Promise<Paged<ProductCard>> {
  const [rows, [{ n }]] = await Promise.all([
    db
      .select(cardColumns)
      .from(products)
      .where(publishedOf(factoryId))
      .orderBy(...newestFirst)
      .limit(size)
      .offset(offsetOf(page, size)),
    db.select({ n: count() }).from(products).where(publishedOf(factoryId)),
  ]);
  return { items: await withMainImages(db, rows), total: n, pageCount: pageCountOf(n, size) };
}

/** A published product of this factory by its code, with all images; null otherwise (another factory's code included). */
export async function findProduct(db: AnyPgDb, factoryId: string, code: number): Promise<ProductPage | null> {
  const [row] = await db
    .select({ ...cardColumns, factoryId: products.factoryId, updatedAt: products.updatedAt })
    .from(products)
    .where(and(eq(products.id, code), publishedOf(factoryId)))
    .limit(1);
  if (!row) return null;
  const images = await db
    .select(imageColumns(media))
    .from(productImages)
    .innerJoin(media, eq(media.id, productImages.mediaId))
    .where(eq(productImages.productId, code))
    .orderBy(asc(productImages.sort), asc(productImages.mediaId));
  return { ...row, image: images[0] ?? null, images };
}

/** "Oxşar məhsullar": the same factory's newest other published products. */
export async function listSimilarProducts(db: AnyPgDb, factoryId: string, code: number, limit: number): Promise<ProductCard[]> {
  const rows = await db
    .select(cardColumns)
    .from(products)
    .where(and(publishedOf(factoryId), ne(products.id, code)))
    .orderBy(...newestFirst)
    .limit(limit);
  return withMainImages(db, rows);
}

// Published and not past its end date. Must match vacancies_factory_list_idx (published_at DESC NULLS FIRST, id DESC NULLS FIRST).
const openVacancies = (factoryId: string) =>
  and(
    eq(vacancies.factoryId, factoryId),
    eq(vacancies.status, "published"),
    or(isNull(vacancies.expiresAt), gt(vacancies.expiresAt, sql`now()`)),
  );

/** "Vakansiyalar" tab: open vacancies, newest first, 8 per page. */
export async function listFactoryVacancies(db: AnyPgDb, factoryId: string, page: number, size: number): Promise<Paged<VacancyCard>> {
  const [items, [{ n }]] = await Promise.all([
    db
      .select({
        id: vacancies.id,
        slug: vacancies.slug,
        title: vacancies.title,
        cityId: vacancies.cityId,
        salary: vacancies.salary,
        currency: vacancies.currency,
        employmentType: vacancies.employmentType,
        publishedAt: vacancies.publishedAt,
        expiresAt: vacancies.expiresAt,
      })
      .from(vacancies)
      .where(openVacancies(factoryId))
      .orderBy(desc(vacancies.publishedAt), desc(vacancies.id))
      .limit(size)
      .offset(offsetOf(page, size)),
    db.select({ n: count() }).from(vacancies).where(openVacancies(factoryId)),
  ]);
  return { items, total: n, pageCount: pageCountOf(n, size) };
}

/** Current slug of a published product of a published factory (by factory slug and product code), or null. The proxy's 301 check. */
export async function findProductSlug(db: AnyPgDb, factorySlug: string, code: number): Promise<string | null> {
  const [row] = await db
    .select({ slug: products.slug })
    .from(products)
    .innerJoin(factories, eq(factories.id, products.factoryId))
    .where(and(eq(products.id, code), eq(products.status, "published"), eq(factories.slug, factorySlug), eq(factories.status, "published")))
    .limit(1);
  return row?.slug ?? null;
}
