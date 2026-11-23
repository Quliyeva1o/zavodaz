"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { factories } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { FACTORIES_TAG, invalidateTags } from "@/lib/cache/tags";
import { uniqueSlug } from "@/features/catalog/slug";
import { factoryRawFromForm, factoryToRaw, parseFactory, tariffRankOf, type FactoryRaw } from "@/features/factories/admin";
import { coverRef, factorySlugTaken, missingDictRefs, type CoverRef } from "@/features/factories/admin-db";
import { deleteImage, saveImage } from "@/features/media/store";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES } from "@/features/media/url";

export type FactoryState =
  | { ok?: boolean; error?: string; errors?: Record<string, string>; values?: FactoryRaw; cover?: CoverRef | null; seq?: number }
  | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const COVER_ERRORS = {
  type: "Yalnız JPG, PNG və ya WebP",
  size: "Fayl 8 MB-dan böyük ola bilməz",
  decode: "Şəkil oxunmadı",
} as const;
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

  const file = form.get("cover");
  const upload = file instanceof File && file.size > 0 ? file : null;
  const errors: Record<string, string> = {};
  if (upload && !(ALLOWED_TYPES as readonly string[]).includes(upload.type)) errors.cover = COVER_ERRORS.type;
  else if (upload && upload.size > MAX_UPLOAD_BYTES) errors.cover = COVER_ERRORS.size;

  const parsed = parseFactory(values);
  if (!parsed.ok) return { errors: { ...parsed.errors, ...errors }, values };
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
  if (Object.keys(errors).length > 0) return { errors, values };

  let newCoverId: string | null = null;
  if (upload) {
    const saved = await saveImage(upload);
    if ("error" in saved) return { errors: { cover: COVER_ERRORS[saved.error] }, values };
    newCoverId = saved.id;
  }
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
    if (newCoverId) await deleteImage(newCoverId);
    if (isUniqueViolation(e)) return { errors: { slug: SLUG_TAKEN }, values };
    throw e;
  }

  // The replaced / removed cover goes away with its files unless something else still uses it.
  if (existing?.coverId && existing.coverId !== coverId) await deleteImage(existing.coverId);
  await invalidateTags([FACTORIES_TAG]);

  if (!id) redirect(`/admin/factories/${savedId}?saved=1`);
  return { ok: true, values: factoryToRaw(row), cover: await coverRef(coverId) };
}
