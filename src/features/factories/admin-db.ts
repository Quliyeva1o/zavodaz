import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, ne, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { dictCities, dictIndustries, dictProductionModels, dictProductTypes, factories, media } from "@/db/schema";
import type { FactoryType } from "@/features/catalog/types";
import { escapeLike, type FactoryInput, type FactoryStatus } from "./admin";

export const ADMIN_PAGE_SIZE = 50;

type DictTable = typeof dictCities | typeof dictIndustries | typeof dictProductTypes | typeof dictProductionModels;

export type AdminFactoryRow = {
  id: string;
  name: string;
  type: FactoryType;
  city: string | null;
  status: FactoryStatus;
  verified: boolean;
  tariffCode: string;
  tariffUntil: Date | null;
  updatedAt: Date;
};

export async function listFactoriesAdmin(opts: { q: string; type: FactoryType | null; status: FactoryStatus | null; page: number }) {
  const where: SQL[] = [];
  if (opts.q) where.push(ilike(factories.name, `%${escapeLike(opts.q)}%`));
  if (opts.type) where.push(eq(factories.type, opts.type));
  if (opts.status) where.push(eq(factories.status, opts.status));
  const cond = where.length > 0 ? and(...where) : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db
      .select({
        id: factories.id,
        name: factories.name,
        type: factories.type,
        city: dictCities.name,
        status: factories.status,
        verified: factories.verified,
        tariffCode: factories.tariffCode,
        tariffUntil: factories.tariffUntil,
        updatedAt: factories.updatedAt,
      })
      .from(factories)
      .leftJoin(dictCities, eq(dictCities.id, factories.cityId))
      .where(cond)
      .orderBy(desc(factories.updatedAt), desc(factories.id))
      .limit(ADMIN_PAGE_SIZE)
      .offset((opts.page - 1) * ADMIN_PAGE_SIZE),
    db.select({ n: count() }).from(factories).where(cond),
  ]);
  return { rows: rows.map((r): AdminFactoryRow => ({ ...r, city: r.city?.az ?? null })), total: n };
}

export type CoverRef = { id: string; variants: number[] };

export async function getFactoryForEdit(id: string) {
  const logo = alias(media, "logo");
  const [row] = await db
    .select({
      id: factories.id,
      type: factories.type,
      name: factories.name,
      slug: factories.slug,
      about: factories.about,
      industryId: factories.industryId,
      productTypeId: factories.productTypeId,
      cityId: factories.cityId,
      productionModelIds: factories.productionModelIds,
      cooperation: factories.cooperation,
      verified: factories.verified,
      status: factories.status,
      tariffCode: factories.tariffCode,
      tariffUntil: factories.tariffUntil,
      legalName: factories.legalName,
      equipmentText: factories.equipmentText,
      employeeCount: factories.employeeCount,
      capacityText: factories.capacityText,
      phone: factories.phone,
      email: factories.email,
      website: factories.website,
      address: factories.address,
      youtubeUrl: factories.youtubeUrl,
      socials: factories.socials,
      coverId: factories.coverId,
      coverVariants: media.variants,
      logoId: factories.logoId,
      logoVariants: logo.variants,
    })
    .from(factories)
    .leftJoin(media, eq(media.id, factories.coverId))
    .leftJoin(logo, eq(logo.id, factories.logoId))
    .where(eq(factories.id, id));
  if (!row) return null;
  const { coverId, coverVariants, logoId, logoVariants, ...factory } = row;
  const cover: CoverRef | null = coverId && coverVariants ? { id: coverId, variants: coverVariants } : null;
  const logoRef: CoverRef | null = logoId && logoVariants ? { id: logoId, variants: logoVariants } : null;
  return { factory, cover, logo: logoRef };
}

export async function coverRef(id: string | null): Promise<CoverRef | null> {
  if (!id) return null;
  const [m] = await db.select({ id: media.id, variants: media.variants }).from(media).where(eq(media.id, id));
  return m ?? null;
}

/** Options of the four dictionaries for the form selects (AZ names, site order). */
export async function dictOptions() {
  const list = (t: DictTable) => db.select({ id: t.id, name: t.name }).from(t).orderBy(asc(t.sort), asc(t.id));
  const [cities, industries, productTypes, productionModels] = await Promise.all([
    list(dictCities),
    list(dictIndustries),
    list(dictProductTypes),
    list(dictProductionModels),
  ]);
  const az = (rows: { id: number; name: { az: string } }[]) => rows.map((r) => ({ id: r.id, label: r.name.az }));
  return { cities: az(cities), industries: az(industries), productTypes: az(productTypes), productionModels: az(productionModels) };
}
export type DictOptions = Awaited<ReturnType<typeof dictOptions>>;

/** Field errors for dictionary ids that do not exist (production models have no FK, so this is the only guard). */
export async function missingDictRefs(d: FactoryInput): Promise<Record<string, string>> {
  const errors: Record<string, string> = {};
  const one = async (field: string, t: DictTable, id: number | null) => {
    if (id === null) return;
    const [row] = await db.select({ id: t.id }).from(t).where(eq(t.id, id));
    if (!row) errors[field] = "Seçilmiş dəyər tapılmadı";
  };
  await Promise.all([
    one("cityId", dictCities, d.cityId),
    one("industryId", dictIndustries, d.industryId),
    one("productTypeId", dictProductTypes, d.productTypeId),
    (async () => {
      if (d.productionModelIds.length === 0) return;
      const rows = await db.select({ id: dictProductionModels.id }).from(dictProductionModels).where(inArray(dictProductionModels.id, d.productionModelIds));
      if (rows.length !== d.productionModelIds.length) errors.productionModelIds = "Seçilmiş dəyər tapılmadı";
    })(),
  ]);
  return errors;
}

/** Is `slug` used by a factory other than `exceptId`? */
export async function factorySlugTaken(slug: string, exceptId: string | null): Promise<boolean> {
  const [row] = await db
    .select({ id: factories.id })
    .from(factories)
    .where(exceptId ? and(eq(factories.slug, slug), ne(factories.id, exceptId)) : eq(factories.slug, slug))
    .limit(1);
  return !!row;
}

/** An uploaded image may become this factory's cover: it exists, is an image (not a PDF) and no other factory uses it. */
export async function coverUploadUsable(mediaId: string, factoryId: string | null): Promise<boolean> {
  const [m] = await db.select({ id: media.id }).from(media).where(and(eq(media.id, mediaId), eq(media.kind, "image")));
  if (!m) return false;
  const [other] = await db
    .select({ id: factories.id })
    .from(factories)
    .where(factoryId ? and(eq(factories.coverId, mediaId), ne(factories.id, factoryId)) : eq(factories.coverId, mediaId))
    .limit(1);
  return !other;
}
