// Admin dictionary form (cities, industries, product types, production models). Server only (zod).
import { z } from "zod";
import type { Localized } from "@/i18n/config";
import { slugify } from "./slug";

/** URL segment of /admin/dictionaries/<kind> → label. */
export const DICT_KINDS = {
  cities: { title: "Şəhər / Region", plural: "Şəhərlər / Regionlar" },
  industries: { title: "Sahə", plural: "Sahələr" },
  "product-types": { title: "Məhsul tipi", plural: "Məhsul tipləri" },
  "production-models": { title: "İstehsalat modeli", plural: "İstehsalat modelləri" },
} as const;
export type DictKind = keyof typeof DICT_KINDS;
export const isDictKind = (v: string): v is DictKind => Object.hasOwn(DICT_KINDS, v);

const NAME_MAX = "Ən çox 80 simvol";

export const dictFormSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{1,80}$/, "Yalnız kiçik latın hərfləri, rəqəm və tire (1–80)"),
  name: z.object({
    az: z.string().trim().min(1, "Ad (AZ) məcburidir").max(80, NAME_MAX),
    en: z.string().trim().max(80, NAME_MAX),
    ru: z.string().trim().max(80, NAME_MAX),
  }),
  sort: z.number({ error: "Tam ədəd yazın" }).int("Tam ədəd yazın").min(0, "0 və ya böyük").max(1_000_000, "Ən çox 1000000"),
});

export type DictEntry = { slug: string; name: Localized; sort: number };
export type DictRaw = Record<"slug" | "name.az" | "name.en" | "name.ru" | "sort", string>;

export function dictRawFromForm(form: FormData): DictRaw {
  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : "";
  };
  return { slug: get("slug"), "name.az": get("name.az"), "name.en": get("name.en"), "name.ru": get("name.ru"), sort: get("sort") };
}

/** An empty slug is made from the AZ name. */
export function parseDictEntry(raw: DictRaw): { ok: true; data: DictEntry } | { ok: false; errors: Record<string, string> } {
  const sort = raw.sort.trim();
  const r = dictFormSchema.safeParse({
    slug: raw.slug.trim() || slugify(raw["name.az"]).slice(0, 80),
    name: { az: raw["name.az"], en: raw["name.en"], ru: raw["name.ru"] },
    sort: /^-?\d+(\.\d+)?$/.test(sort) ? Number(sort) : undefined,
  });
  if (r.success) return { ok: true, data: r.data };
  const errors: Record<string, string> = {};
  for (const i of r.error.issues) {
    const key = i.path.join(".");
    // No AZ name and no slug: the slug message would only repeat the missing name.
    if (key === "slug" && !raw.slug.trim() && !raw["name.az"].trim()) continue;
    errors[key] ??= i.message;
  }
  return { ok: false, errors };
}
