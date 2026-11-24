// Admin factory form: zod schema (Azerbaijani messages), tariff rank, raw form helpers. Server only (zod).
import { z } from "zod";
import { slugify } from "@/features/catalog/slug";
import { COOPERATION, FACTORY_TYPES, TARIFF_RANK, type FactoryType } from "@/features/catalog/types";
import { factoryContentShape } from "@/features/factory/content-admin";
import { SOCIALS, type SocialKey } from "@/features/settings/links";

export const FACTORY_STATUSES = ["draft", "published", "hidden"] as const;
export type FactoryStatus = (typeof FACTORY_STATUSES)[number];
export const TARIFF_CODES = ["standart", "premium", "vip"] as const;
export type TariffCode = (typeof TARIFF_CODES)[number];

/** 2 vip, 1 premium, 0 standart / unknown / expired (`until` not after `now`). */
export function tariffRankOf(code: string, until: Date | null, now = new Date()): 0 | 1 | 2 {
  if (!(code in TARIFF_RANK)) return 0;
  if (until && until.getTime() <= now.getTime()) return 0;
  return TARIFF_RANK[code as keyof typeof TARIFF_RANK];
}

// The tariff end is picked as a day; it stays valid until the end of that day in Baku (UTC+4, no DST).
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const BAKU = "Asia/Baku";

export function tariffUntilFromInput(day: string): Date | null {
  if (!day) return null;
  if (!DAY.test(day)) return null;
  const d = new Date(`${day}T23:59:59.999+04:00`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== day ? null : d;
}

export function tariffUntilToInput(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: BAKU, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** `%`, `_` and `\` are LIKE wildcards / the escape character: match them literally. */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (ch) => `\\${ch}`);

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MSG = "Yalnız kiçik latın hərfləri, rəqəm və tire";

const optionalId = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : typeof v === "string" ? Number(v) : v),
  z.number({ error: "Yanlış seçim" }).int("Yanlış seçim").positive("Yanlış seçim").nullable(),
);

const tariffUntil = z
  .string()
  .default("")
  .transform((v, ctx) => {
    if (v === "") return null;
    const d = tariffUntilFromInput(v);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Tarix formatı: İİİİ-AA-GG" });
      return z.NEVER;
    }
    return d;
  });

export const factoryFormSchema = z
  .object({
    type: z.enum(FACTORY_TYPES, { error: "Tipi seçin" }),
    name: z.string({ error: "Ad məcburidir" }).trim().min(2, "Ən azı 2 simvol").max(120, "Ən çox 120 simvol"),
    slug: z
      .string()
      .trim()
      .max(120, "Ən çox 120 simvol")
      .refine((s) => s === "" || SLUG_RE.test(s), SLUG_MSG)
      .default(""),
    // A textarea counts a line break as one character; the submitted form sends CRLF.
    about: z
      .string()
      .default("")
      .transform((s) => s.replace(/\r\n/g, "\n").trim())
      .pipe(z.string().max(400, "Ən çox 400 simvol")),
    industryId: optionalId.default(null),
    productTypeId: optionalId.default(null),
    cityId: optionalId.default(null),
    productionModelIds: z
      .array(z.coerce.number({ error: "Yanlış seçim" }).int("Yanlış seçim").positive("Yanlış seçim"))
      .max(50, "Çox seçim")
      .default([])
      .transform((ids) => [...new Set(ids)].sort((a, b) => a - b)),
    cooperation: z
      .array(z.enum(COOPERATION, { error: "Naməlum əməkdaşlıq növü" }))
      .default([])
      .transform((list) => COOPERATION.filter((c) => list.includes(c))),
    verified: z.boolean().default(false),
    status: z.enum(FACTORY_STATUSES, { error: "Statusu seçin" }).default("draft"),
    tariffCode: z.enum(TARIFF_CODES, { error: "Tarifi seçin" }).default("standart"),
    tariffUntil,
    ...factoryContentShape,
  })
  .transform((d, ctx) => {
    const slug = d.slug || slugify(d.name).slice(0, 120).replace(/-+$/, "");
    if (!slug) {
      ctx.addIssue({ code: "custom", path: ["slug"], message: "Addan slug alınmadı, slug-ı əl ilə yazın" });
      return z.NEVER;
    }
    return { ...d, slug, slugManual: d.slug !== "" };
  });

export type FactoryInput = z.output<typeof factoryFormSchema>;

/** Raw form values (kept on error, so the admin never loses what was typed). */
export type FactoryRaw = {
  type: string;
  name: string;
  slug: string;
  about: string;
  industryId: string;
  productTypeId: string;
  cityId: string;
  productionModelIds: string[];
  cooperation: string[];
  verified: boolean;
  status: string;
  tariffCode: string;
  tariffUntil: string;
  removeCover: boolean;
  removeLogo: boolean;
  legalName: string;
  equipmentText: string;
  employeeCount: string;
  capacityText: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  youtubeUrl: string;
  socials: Record<SocialKey, string>;
};

const EMPTY_SOCIALS = Object.fromEntries(SOCIALS.map((k) => [k, ""])) as Record<SocialKey, string>;

export const EMPTY_FACTORY: FactoryRaw = {
  type: "zavod",
  name: "",
  slug: "",
  about: "",
  industryId: "",
  productTypeId: "",
  cityId: "",
  productionModelIds: [],
  cooperation: [],
  verified: false,
  status: "draft",
  tariffCode: "standart",
  tariffUntil: "",
  removeCover: false,
  removeLogo: false,
  legalName: "",
  equipmentText: "",
  employeeCount: "",
  capacityText: "",
  phone: "",
  email: "",
  website: "",
  address: "",
  youtubeUrl: "",
  socials: EMPTY_SOCIALS,
};

export function factoryRawFromForm(form: FormData): FactoryRaw {
  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : "";
  };
  const all = (k: string) => form.getAll(k).filter((v): v is string => typeof v === "string");
  return {
    type: get("type"),
    name: get("name"),
    slug: get("slug"),
    about: get("about"),
    industryId: get("industryId"),
    productTypeId: get("productTypeId"),
    cityId: get("cityId"),
    productionModelIds: all("productionModelIds"),
    cooperation: all("cooperation"),
    verified: form.get("verified") === "on",
    status: get("status"),
    tariffCode: get("tariffCode"),
    tariffUntil: get("tariffUntil"),
    removeCover: form.get("removeCover") === "on",
    removeLogo: form.get("removeLogo") === "on",
    legalName: get("legalName"),
    equipmentText: get("equipmentText"),
    employeeCount: get("employeeCount"),
    capacityText: get("capacityText"),
    phone: get("phone"),
    email: get("email"),
    website: get("website"),
    address: get("address"),
    youtubeUrl: get("youtubeUrl"),
    socials: Object.fromEntries(SOCIALS.map((k) => [k, get("social_" + k)])) as Record<SocialKey, string>,
  };
}

type FactoryRow = {
  type: FactoryType;
  name: string;
  slug: string;
  about: string;
  industryId: number | null;
  productTypeId: number | null;
  cityId: number | null;
  productionModelIds: number[];
  cooperation: string[];
  verified: boolean;
  status: FactoryStatus;
  tariffCode: string;
  tariffUntil: Date | null;
  legalName: string;
  equipmentText: string;
  employeeCount: number | null;
  capacityText: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  youtubeUrl: string;
  socials: Partial<Record<SocialKey, string>>;
};

export const factoryToRaw = (f: FactoryRow): FactoryRaw => ({
  type: f.type,
  name: f.name,
  slug: f.slug,
  about: f.about,
  industryId: f.industryId === null ? "" : String(f.industryId),
  productTypeId: f.productTypeId === null ? "" : String(f.productTypeId),
  cityId: f.cityId === null ? "" : String(f.cityId),
  productionModelIds: f.productionModelIds.map(String),
  cooperation: f.cooperation,
  verified: f.verified,
  status: f.status,
  tariffCode: f.tariffCode,
  tariffUntil: tariffUntilToInput(f.tariffUntil),
  removeCover: false,
  removeLogo: false,
  legalName: f.legalName,
  equipmentText: f.equipmentText,
  employeeCount: f.employeeCount === null ? "" : String(f.employeeCount),
  capacityText: f.capacityText,
  phone: f.phone,
  email: f.email,
  website: f.website,
  address: f.address,
  youtubeUrl: f.youtubeUrl,
  socials: { ...EMPTY_SOCIALS, ...f.socials },
});

export function parseFactory(raw: FactoryRaw): { ok: true; data: FactoryInput } | { ok: false; errors: Record<string, string> } {
  const r = factoryFormSchema.safeParse(raw); // removeCover / removeLogo are not schema keys: zod strips them
  if (r.success) return { ok: true, data: r.data };
  const errors: Record<string, string> = {};
  for (const i of r.error.issues) {
    const key = i.path[0] === "socials" && typeof i.path[1] === "string" ? "social_" + i.path[1] : String(i.path[0] ?? "form");
    errors[key] ??= i.message;
  }
  return { ok: false, errors };
}
