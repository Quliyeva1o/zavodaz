"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { factories } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { FACTORIES_TAG, invalidateTags } from "@/lib/cache/tags";
import { uniqueSlug } from "@/features/catalog/slug";
import { factoryRawFromForm, factoryToRaw, parseFactory, tariffRankOf, type FactoryRaw } from "@/features/factories/admin";
import { coverRef, coverUploadUsable, factorySlugTaken, missingDictRefs, type CoverRef } from "@/features/factories/admin-db";
import { deleteImage } from "@/features/media/store";

export type FactoryState =
  | {
      ok?: boolean;
      error?: string;
      errors?: Record<string, string>;
      values?: FactoryRaw;
      cover?: CoverRef | null;
      /** The uploaded cover was deleted (the save failed after all): the form must forget its id. */
      uploadDropped?: boolean;
      seq?: number;
    }
  | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UPLOAD_GONE = "Yüklənmiş şəkil tapılmadı, şəkli yenidən seçin";
const SLUG_TAKEN = "Bu slug artıq başqa zavoddadır";
const isUniqueViolation = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";

export async function saveFactory(_prev: FactoryState, form: FormData): Promise<FactoryState> {
  await requireAdmin();
  const values = factoryRawFromForm(form);
  // "Gizlət": the same form, saved with status hidden (factories are never deleted here; spec: accounts close in step 6).
  if (form.get("hide") === "1") values.status = "hidden";
  const idRaw = String(form.get("id") ?? "");
  if (idRaw !== "" && !UUID.test(idRaw)) return { error: "Zavod tapılmadı", values };
  const id = idRaw || null;

  // The image itself went to POST /api/admin/media (R18); the form sends only the returned media id.
  const uploadRaw = String(form.get("coverUploadId") ?? "");
  const errors: Record<string, string> = {};
  if (uploadRaw !== "" && !UUID.test(uploadRaw)) errors.cover = UPLOAD_GONE;

  const parsed = parseFactory(values);
  // A rejected upload id is forgotten by the form (uploadDropped), so the next save does not repeat the error.
  if (!parsed.ok) return { errors: { ...parsed.errors, ...errors }, values, uploadDropped: errors.cover === UPLOAD_GONE };
  const data = parsed.data;
  Object.assign(errors, await missingDictRefs(data));

  let existing: { coverId: string | null } | undefined;
  if (id) {
    [existing] = await db.select({ coverId: factories.coverId }).from(factories).where(eq(factories.id, id));
    if (!existing) return { error: "Zavod tapılmadı", values };
  }

  let slug = data.slug;
  if (data.slugManual) {
    if (await factorySlugTaken(slug, id)) errors.slug = SLUG_TAKEN;
  } else {
    slug = await uniqueSlug(slug, (s) => factorySlugTaken(s, id));
  }
  if (uploadRaw !== "" && !errors.cover && !(await coverUploadUsable(uploadRaw, id))) errors.cover = UPLOAD_GONE;
  if (Object.keys(errors).length > 0) return { errors, values, uploadDropped: errors.cover === UPLOAD_GONE };

  const newCoverId: string | null = uploadRaw || null;
  const coverId = newCoverId ?? (values.removeCover ? null : (existing?.coverId ?? null));

  const row = {
    type: data.type,
    name: data.name,
    slug,
    about: data.about,
    industryId: data.industryId,
    productTypeId: data.productTypeId,
    cityId: data.cityId,
    productionModelIds: data.productionModelIds,
    cooperation: data.cooperation,
    coverId,
    verified: data.verified,
    status: data.status,
    tariffCode: data.tariffCode,
    tariffUntil: data.tariffUntil,
    tariffRank: tariffRankOf(data.tariffCode, data.tariffUntil),
  };

  let savedId: string;
  try {
    if (id) {
      await db.update(factories).set(row).where(eq(factories.id, id));
      savedId = id;
    } else {
      [{ id: savedId }] = await db.insert(factories).values(row).returning({ id: factories.id });
    }
  } catch (e) {
    // The write failed: the new upload would be an orphan. Its cleanup must never hide the original error.
    let dropped = false;
    if (newCoverId && newCoverId !== existing?.coverId) {
      try {
        dropped = await deleteImage(newCoverId);
      } catch (cleanup) {
        console.error("factory save: could not delete the new cover", newCoverId, cleanup);
      }
    }
    if (isUniqueViolation(e)) {
      return { errors: { slug: SLUG_TAKEN, ...(dropped ? { cover: "Şəkli yenidən seçin" } : {}) }, values, uploadDropped: dropped };
    }
    throw e;
  }

  // The replaced / removed cover goes away with its files unless something else still uses it. The save is already
  // committed, so a failure here is only logged (the daily sweep removes it later).
  if (existing?.coverId && existing.coverId !== coverId) {
    try {
      await deleteImage(existing.coverId);
    } catch (cleanup) {
      console.error("factory save: could not delete the old cover", existing.coverId, cleanup);
    }
  }
  await invalidateTags([FACTORIES_TAG]);

  if (!id) redirect(`/admin/factories/${savedId}?saved=1`);
  return { ok: true, values: factoryToRaw(row), cover: await coverRef(coverId) };
}
