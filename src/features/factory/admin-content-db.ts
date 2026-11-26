import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { factories, factoryCertificates, factoryFiles, factoryImages, media, productImages, products } from "@/db/schema";
import { isMediaUnreferenced } from "@/features/media/sweep";
import type { MediaKind, MediaRef } from "@/features/media/url";
import type { AnyPgDb } from "@/lib/cache/tag-store";

/** Header of the factory admin pages. */
export async function getFactoryHead(id: string) {
  const [row] = await db.select({ id: factories.id, name: factories.name, slug: factories.slug, status: factories.status }).from(factories).where(eq(factories.id, id));
  return row ?? null;
}

export type GalleryItem = MediaRef;

export async function listFactoryGallery(factoryId: string): Promise<GalleryItem[]> {
  return db
    .select({ id: media.id, variants: media.variants })
    .from(factoryImages)
    .innerJoin(media, eq(media.id, factoryImages.mediaId))
    .where(eq(factoryImages.factoryId, factoryId))
    .orderBy(asc(factoryImages.sort), asc(factoryImages.mediaId));
}

export async function listCertificatesAdmin(factoryId: string) {
  return db
    .select({ id: factoryCertificates.id, title: factoryCertificates.title, mediaId: media.id, variants: media.variants })
    .from(factoryCertificates)
    .innerJoin(media, eq(media.id, factoryCertificates.mediaId))
    .where(eq(factoryCertificates.factoryId, factoryId))
    .orderBy(asc(factoryCertificates.sort), asc(factoryCertificates.id));
}

export async function listFilesAdmin(factoryId: string) {
  return db
    .select({ id: factoryFiles.id, title: factoryFiles.title, mediaId: media.id, size: media.size })
    .from(factoryFiles)
    .innerJoin(media, eq(media.id, factoryFiles.mediaId))
    .where(eq(factoryFiles.factoryId, factoryId))
    .orderBy(asc(factoryFiles.sort), asc(factoryFiles.id));
}

export async function listProductsAdmin(factoryId: string) {
  const rows = await db
    .select({ id: products.id, name: products.name, status: products.status, updatedAt: products.updatedAt })
    .from(products)
    .where(eq(products.factoryId, factoryId))
    .orderBy(desc(products.createdAt), desc(products.id));
  if (rows.length === 0) return [];
  const images = await db
    .select({ productId: productImages.productId, id: media.id, variants: media.variants, sort: productImages.sort })
    .from(productImages)
    .innerJoin(media, eq(media.id, productImages.mediaId))
    .where(inArray(productImages.productId, rows.map((r) => r.id)))
    .orderBy(asc(productImages.sort), asc(productImages.mediaId));
  const main = new Map<number, MediaRef>();
  for (const i of images) if (!main.has(i.productId)) main.set(i.productId, { id: i.id, variants: i.variants });
  return rows.map((r) => ({ ...r, image: main.get(r.id) ?? null }));
}

export async function getProductForEdit(factoryId: string, productId: number) {
  const [row] = await db
    .select({ id: products.id, name: products.name, description: products.description, status: products.status, slug: products.slug })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.factoryId, factoryId)));
  return row ?? null;
}

export async function listProductGallery(productId: number): Promise<GalleryItem[]> {
  return db
    .select({ id: media.id, variants: media.variants })
    .from(productImages)
    .innerJoin(media, eq(media.id, productImages.mediaId))
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.sort), asc(productImages.mediaId));
}

/** A fresh upload of the right kind that nothing references yet may be attached. */
export const uploadUsable = (mediaId: string, kind: MediaKind, conn: AnyPgDb = db) => isMediaUnreferenced(conn, mediaId, kind);

