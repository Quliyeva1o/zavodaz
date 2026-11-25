"use server";

import { and, asc, count, eq, max } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { factories, factoryCertificates, factoryFiles, factoryImages, productImages, products } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { factoryTag, invalidateTags, REDIRECTS_TAG } from "@/lib/cache/tags";
import { uploadUsable } from "@/features/factory/admin-content-db";
import { MAX_FACTORY_IMAGES, MAX_PRODUCT_IMAGES, moveItem, parseProduct, parseTitle, type ProductRaw } from "@/features/factory/content-admin";
import { deleteImage } from "@/features/media/store";

// Content of one factory (gallery, certificates, PDF catalogues, products). Every write invalidates factoryTag(id) (R4).
// The files themselves went to POST /api/admin/media first; the forms send only the returned media id.

export type ContentState = { ok?: boolean; error?: string; errors?: Record<string, string>; values?: ProductRaw; seq?: number } | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PRODUCT_ID = /^[1-9]\d{0,15}$/;
const UPLOAD_GONE = "Yüklənmiş fayl tapılmadı, faylı yenidən seçin";

const str = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
};
const uuidOf = (form: FormData, key: string) => (UUID.test(str(form, key)) ? str(form, key) : null);
const productIdOf = (form: FormData, key = "productId") => (PRODUCT_ID.test(str(form, key)) ? Number(str(form, key)) : null);

/** The media goes away with its row unless something else still uses it. A failure is only logged (the daily sweep retries). */
async function dropMedia(ids: string[]) {
  for (const id of ids) {
    try {
      await deleteImage(id);
    } catch (e) {
      console.error("factory content: could not delete media", id, e);
    }
  }
}

// ---------- Factory gallery (max 6) ----------

export async function addFactoryImage(_prev: ContentState, form: FormData): Promise<ContentState> {
  await requireAdmin();
  const factoryId = uuidOf(form, "factoryId");
  const mediaId = uuidOf(form, "mediaId");
  if (!factoryId) return { error: "Zavod tapılmadı" };
  if (!mediaId) return { error: UPLOAD_GONE };
  const error = await db.transaction(async (tx) => {
    const [f] = await tx.select({ id: factories.id }).from(factories).where(eq(factories.id, factoryId)).for("update");
    if (!f) return "Zavod tapılmadı";
    const [{ n, top }] = await tx.select({ n: count(), top: max(factoryImages.sort) }).from(factoryImages).where(eq(factoryImages.factoryId, factoryId));
    if (n >= MAX_FACTORY_IMAGES) return `Ən çox ${MAX_FACTORY_IMAGES} şəkil əlavə etmək olar`;
    if (!(await uploadUsable(mediaId, "image", tx))) return UPLOAD_GONE;
    await tx.insert(factoryImages).values({ factoryId, mediaId, sort: (top ?? -1) + 1 });
    return null;
  });
  if (error) {
    if (error !== UPLOAD_GONE) await dropMedia([mediaId]); // refused: the fresh upload would be an orphan
    return { error };
  }
  await invalidateTags([factoryTag(factoryId)]);
  return { ok: true };
}

export async function deleteFactoryImage(form: FormData): Promise<void> {
  await requireAdmin();
  const factoryId = uuidOf(form, "factoryId");
  const mediaId = uuidOf(form, "mediaId");
  if (!factoryId || !mediaId) return;
  const deleted = await db.delete(factoryImages).where(and(eq(factoryImages.factoryId, factoryId), eq(factoryImages.mediaId, mediaId))).returning({ id: factoryImages.mediaId });
  if (deleted.length === 0) return;
  await dropMedia([mediaId]);
  await invalidateTags([factoryTag(factoryId)]);
}

export async function moveFactoryImage(form: FormData): Promise<void> {
  await requireAdmin();
  const factoryId = uuidOf(form, "factoryId");
  const mediaId = uuidOf(form, "mediaId");
  const dir = str(form, "dir");
  if (!factoryId || !mediaId || (dir !== "up" && dir !== "down")) return;
  await db.transaction(async (tx) => {
    await tx.select({ id: factories.id }).from(factories).where(eq(factories.id, factoryId)).for("update");
    const rows = await tx.select({ mediaId: factoryImages.mediaId }).from(factoryImages).where(eq(factoryImages.factoryId, factoryId)).orderBy(asc(factoryImages.sort), asc(factoryImages.mediaId));
    const order = moveItem(
      rows.map((r) => r.mediaId),
      mediaId,
      dir,
    );
    for (const [sort, id] of order.entries()) {
      await tx.update(factoryImages).set({ sort }).where(and(eq(factoryImages.factoryId, factoryId), eq(factoryImages.mediaId, id)));
    }
  });
  await invalidateTags([factoryTag(factoryId)]);
}

// ---------- Certificates (title + image) ----------

export async function addCertificate(_prev: ContentState, form: FormData): Promise<ContentState> {
  await requireAdmin();
  const factoryId = uuidOf(form, "factoryId");
  const mediaId = uuidOf(form, "mediaId");
  if (!factoryId) return { error: "Zavod tapılmadı" };
  const title = parseTitle(str(form, "title"));
  if (!title.ok) return { errors: { title: title.error } };
  if (!mediaId) return { errors: { file: "Şəkli seçin" } };
  const error = await db.transaction(async (tx) => {
    const [f] = await tx.select({ id: factories.id }).from(factories).where(eq(factories.id, factoryId)).for("update");
    if (!f) return "Zavod tapılmadı";
    if (!(await uploadUsable(mediaId, "image", tx))) return UPLOAD_GONE;
    const [{ top }] = await tx.select({ top: max(factoryCertificates.sort) }).from(factoryCertificates).where(eq(factoryCertificates.factoryId, factoryId));
    await tx.insert(factoryCertificates).values({ factoryId, mediaId, title: title.title, sort: (top ?? -1) + 1 });
    return null;
  });
  if (error) return error === UPLOAD_GONE ? { errors: { file: error } } : { error };
  await invalidateTags([factoryTag(factoryId)]);
  return { ok: true };
}

export async function deleteCertificate(form: FormData): Promise<void> {
  await requireAdmin();
  const id = uuidOf(form, "id");
  const factoryId = uuidOf(form, "factoryId");
  if (!id || !factoryId) return;
  const [row] = await db.delete(factoryCertificates).where(and(eq(factoryCertificates.id, id), eq(factoryCertificates.factoryId, factoryId))).returning({ factoryId: factoryCertificates.factoryId, mediaId: factoryCertificates.mediaId });
  if (!row) return;
  await dropMedia([row.mediaId]);
  await invalidateTags([factoryTag(row.factoryId)]);
}

// ---------- PDF catalogues (title + PDF) ----------

export async function addCatalogFile(_prev: ContentState, form: FormData): Promise<ContentState> {
  await requireAdmin();
  const factoryId = uuidOf(form, "factoryId");
  const mediaId = uuidOf(form, "mediaId");
  if (!factoryId) return { error: "Zavod tapılmadı" };
  const title = parseTitle(str(form, "title"));
  if (!title.ok) return { errors: { title: title.error } };
  if (!mediaId) return { errors: { file: "PDF faylını seçin" } };
  const error = await db.transaction(async (tx) => {
    const [f] = await tx.select({ id: factories.id }).from(factories).where(eq(factories.id, factoryId)).for("update");
    if (!f) return "Zavod tapılmadı";
    if (!(await uploadUsable(mediaId, "pdf", tx))) return UPLOAD_GONE;
    const [{ top }] = await tx.select({ top: max(factoryFiles.sort) }).from(factoryFiles).where(eq(factoryFiles.factoryId, factoryId));
    await tx.insert(factoryFiles).values({ factoryId, mediaId, title: title.title, sort: (top ?? -1) + 1 });
    return null;
  });
  if (error) return error === UPLOAD_GONE ? { errors: { file: error } } : { error };
  await invalidateTags([factoryTag(factoryId)]);
  return { ok: true };
}

export async function deleteCatalogFile(form: FormData): Promise<void> {
  await requireAdmin();
  const id = uuidOf(form, "id");
  const factoryId = uuidOf(form, "factoryId");
  if (!id || !factoryId) return;
  const [row] = await db.delete(factoryFiles).where(and(eq(factoryFiles.id, id), eq(factoryFiles.factoryId, factoryId))).returning({ factoryId: factoryFiles.factoryId, mediaId: factoryFiles.mediaId });
  if (!row) return;
  await dropMedia([row.mediaId]);
  await invalidateTags([factoryTag(row.factoryId)]);
}

// ---------- Products ----------

const productBelongs = async (factoryId: string, productId: number) => {
  const [p] = await db.select({ id: products.id }).from(products).where(and(eq(products.id, productId), eq(products.factoryId, factoryId)));
  return !!p;
};

export async function saveProduct(_prev: ContentState, form: FormData): Promise<ContentState> {
  await requireAdmin();
  const values: ProductRaw = { name: str(form, "name"), description: str(form, "description"), status: str(form, "status") };
  const factoryId = uuidOf(form, "factoryId");
  if (!factoryId) return { error: "Zavod tapılmadı", values };
  const idRaw = str(form, "productId");
  const productId = idRaw === "" ? null : productIdOf(form);
  if (idRaw !== "" && productId === null) return { error: "Məhsul tapılmadı", values };
  const parsed = parseProduct(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const row = { name: parsed.data.name, slug: parsed.data.slug, description: parsed.data.description, status: parsed.data.status };

  if (productId === null) {
    const [f] = await db.select({ id: factories.id }).from(factories).where(eq(factories.id, factoryId));
    if (!f) return { error: "Zavod tapılmadı", values };
    const [created] = await db.insert(products).values({ ...row, factoryId }).returning({ id: products.id });
    await invalidateTags([factoryTag(factoryId)]);
    redirect(`/admin/factories/${factoryId}/products/${created.id}?saved=1`);
  }
  const [before] = await db.select({ slug: products.slug }).from(products).where(and(eq(products.id, productId), eq(products.factoryId, factoryId)));
  const updated = await db.update(products).set(row).where(and(eq(products.id, productId), eq(products.factoryId, factoryId))).returning({ id: products.id });
  if (updated.length === 0) return { error: "Məhsul tapılmadı", values };
  // A new slug makes the proxy's cached "code → slug" answers stale; REDIRECTS_TAG also clears that LRU in the other processes.
  await invalidateTags([factoryTag(factoryId), ...(before && before.slug !== row.slug ? [REDIRECTS_TAG] : [])]);
  return { ok: true, values: { name: row.name, description: row.description, status: row.status } };
}

export async function deleteProduct(form: FormData): Promise<void> {
  await requireAdmin();
  const factoryId = uuidOf(form, "factoryId");
  const productId = productIdOf(form);
  if (!factoryId || productId === null) return;
  // The image rows go with the product (cascade); then every image is removed unless something else still uses it.
  const mediaIds = await db.transaction(async (tx) => {
    const images = await tx
      .select({ mediaId: productImages.mediaId })
      .from(productImages)
      .innerJoin(products, eq(products.id, productImages.productId))
      .where(and(eq(productImages.productId, productId), eq(products.factoryId, factoryId)));
    const deleted = await tx.delete(products).where(and(eq(products.id, productId), eq(products.factoryId, factoryId))).returning({ id: products.id });
    return deleted.length === 0 ? null : images.map((i) => i.mediaId);
  });
  if (mediaIds === null) return;
  await dropMedia(mediaIds);
  await invalidateTags([factoryTag(factoryId)]);
  redirect(`/admin/factories/${factoryId}/products?deleted=1`);
}

export async function addProductImage(_prev: ContentState, form: FormData): Promise<ContentState> {
  await requireAdmin();
  const factoryId = uuidOf(form, "factoryId");
  const productId = productIdOf(form);
  const mediaId = uuidOf(form, "mediaId");
  if (!factoryId || productId === null) return { error: "Məhsul tapılmadı" };
  if (!mediaId) return { error: UPLOAD_GONE };
  const error = await db.transaction(async (tx) => {
    const [p] = await tx.select({ id: products.id }).from(products).where(and(eq(products.id, productId), eq(products.factoryId, factoryId))).for("update");
    if (!p) return "Məhsul tapılmadı";
    const [{ n, top }] = await tx.select({ n: count(), top: max(productImages.sort) }).from(productImages).where(eq(productImages.productId, productId));
    if (n >= MAX_PRODUCT_IMAGES) return `Ən çox ${MAX_PRODUCT_IMAGES} şəkil əlavə etmək olar`;
    if (!(await uploadUsable(mediaId, "image", tx))) return UPLOAD_GONE;
    await tx.insert(productImages).values({ productId, mediaId, sort: (top ?? -1) + 1 });
    return null;
  });
  if (error) {
    if (error !== UPLOAD_GONE) await dropMedia([mediaId]);
    return { error };
  }
  await invalidateTags([factoryTag(factoryId)]);
  return { ok: true };
}

export async function deleteProductImage(form: FormData): Promise<void> {
  await requireAdmin();
  const factoryId = uuidOf(form, "factoryId");
  const productId = productIdOf(form);
  const mediaId = uuidOf(form, "mediaId");
  if (!factoryId || productId === null || !mediaId || !(await productBelongs(factoryId, productId))) return;
  const deleted = await db.delete(productImages).where(and(eq(productImages.productId, productId), eq(productImages.mediaId, mediaId))).returning({ id: productImages.mediaId });
  if (deleted.length === 0) return;
  await dropMedia([mediaId]);
  await invalidateTags([factoryTag(factoryId)]);
}

export async function moveProductImage(form: FormData): Promise<void> {
  await requireAdmin();
  const factoryId = uuidOf(form, "factoryId");
  const productId = productIdOf(form);
  const mediaId = uuidOf(form, "mediaId");
  const dir = str(form, "dir");
  if (!factoryId || productId === null || !mediaId || (dir !== "up" && dir !== "down")) return;
  await db.transaction(async (tx) => {
    const [p] = await tx.select({ id: products.id }).from(products).where(and(eq(products.id, productId), eq(products.factoryId, factoryId))).for("update");
    if (!p) return;
    const rows = await tx.select({ mediaId: productImages.mediaId }).from(productImages).where(eq(productImages.productId, productId)).orderBy(asc(productImages.sort), asc(productImages.mediaId));
    const order = moveItem(
      rows.map((r) => r.mediaId),
      mediaId,
      dir,
    );
    for (const [sort, id] of order.entries()) {
      await tx.update(productImages).set({ sort }).where(and(eq(productImages.productId, productId), eq(productImages.mediaId, id)));
    }
  });
  await invalidateTags([factoryTag(factoryId)]);
}

