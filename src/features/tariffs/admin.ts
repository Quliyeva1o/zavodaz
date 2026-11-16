import { z } from "zod";
import { locales, type Localized } from "@/i18n/config";

/** Raw form strings (so a failed save keeps what the admin typed). Keys: see `tariffToRaw`. */
export type TariffRaw = Record<string, string>;

export type TariffInput = {
  name: Localized;
  priceMonthQ: number;
  priceYearQ: number | null;
  features: Localized<string[]>;
  limits: { products: number | null; vacancies: number | null };
};

const PRICE = /^\d{1,4}([.,]\d{1,2})?$/;
const LIMIT = /^\d{1,6}$/;
const toQepik = (v: string) => Math.round(Number(v.replace(",", ".")) * 100);
const lines = (v: string) =>
  v
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

const price = z.string().trim().regex(PRICE, "Qiymət formatı: 7.99").transform(toQepik);
const optionalPrice = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    if (!PRICE.test(v)) {
      ctx.addIssue({ code: "custom", message: "Qiymət formatı: 7.99" });
      return z.NEVER;
    }
    return toQepik(v);
  });
const limit = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    if (!LIMIT.test(v)) {
      ctx.addIssue({ code: "custom", message: "Tam ədəd yazın (boş = limitsiz)" });
      return z.NEVER;
    }
    return Number(v);
  });
const featureList = z
  .string()
  .transform(lines)
  .pipe(z.array(z.string().max(120, "Sətir 120 simvoldan uzun ola bilməz")).max(12, "Ən çox 12 xüsusiyyət"));

const schema = z.object({
  name: z.object({
    az: z.string().trim().min(1, "Ad məcburidir").max(60),
    en: z.string().trim().max(60),
    ru: z.string().trim().max(60),
  }),
  priceMonth: price,
  priceYear: optionalPrice,
  features: z.object({ az: featureList, en: featureList, ru: featureList }),
  products: limit,
  vacancies: limit,
});

export const tariffToRaw = (p: TariffInput): TariffRaw => ({
  ...Object.fromEntries(locales.map((l) => [`name.${l}`, p.name[l]])),
  priceMonth: String(p.priceMonthQ / 100),
  priceYear: p.priceYearQ === null ? "" : String(p.priceYearQ / 100),
  ...Object.fromEntries(locales.map((l) => [`features.${l}`, p.features[l].join("\n")])),
  products: p.limits.products === null ? "" : String(p.limits.products),
  vacancies: p.limits.vacancies === null ? "" : String(p.limits.vacancies),
});

export function rawFromForm(form: FormData): TariffRaw {
  const get = (k: string) => String(form.get(k) ?? "");
  return Object.fromEntries([
    ...locales.map((l) => [`name.${l}`, get(`name.${l}`)]),
    ["priceMonth", get("priceMonth")],
    ["priceYear", get("priceYear")],
    ...locales.map((l) => [`features.${l}`, get(`features.${l}`)]),
    ["products", get("products")],
    ["vacancies", get("vacancies")],
  ]);
}

export function parseTariff(raw: TariffRaw): { ok: true; data: TariffInput } | { ok: false; errors: Record<string, string> } {
  const r = schema.safeParse({
    name: { az: raw["name.az"], en: raw["name.en"], ru: raw["name.ru"] },
    priceMonth: raw.priceMonth,
    priceYear: raw.priceYear,
    features: { az: raw["features.az"], en: raw["features.en"], ru: raw["features.ru"] },
    products: raw.products,
    vacancies: raw.vacancies,
  });
  if (!r.success) {
    const errors: Record<string, string> = {};
    for (const i of r.error.issues) errors[i.path.join(".")] ??= i.message;
    return { ok: false, errors };
  }
  const d = r.data;
  return {
    ok: true,
    data: {
      name: d.name,
      priceMonthQ: d.priceMonth,
      priceYearQ: d.priceYear,
      features: d.features,
      limits: { products: d.products, vacancies: d.vacancies },
    },
  };
}
