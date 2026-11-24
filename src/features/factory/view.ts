// What the factory page shows, computed from its data (no server imports: unit-tested in tests/unit/factory-view.test.ts).
import { pick, type Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { SITE_NAME } from "@/features/pages/seo-title";
import { mediaSrc } from "@/features/media/url";
import { SOCIALS } from "@/features/settings/links";
import type { Dict, Dictionaries } from "@/features/catalog/types";
import type { FactoryPage, ProductPage } from "./types";

/** Figma shows an empty feature as "-". */
export const EMPTY = "-";

const nameOf = (list: Dict[], id: number | null) => (id === null ? undefined : list.find((d) => d.id === id)?.name);

/** The six "Haqqında" cards (Figma 331:10213 order): dictionary names in the page language, cooperation labels, numbers. */
export function factoryFeatures(f: FactoryPage, dicts: Dictionaries, lang: Locale): { key: string; label: string; value: string }[] {
  const t = dict(lang);
  const labels = t.factory.features;
  const name = (list: Dict[], id: number | null) => {
    const n = nameOf(list, id);
    return n ? pick(n, lang) : "";
  };
  const models = f.productionModelIds.map((id) => name(dicts.productionModels, id)).filter(Boolean);
  const rows: [keyof typeof labels, string][] = [
    ["industry", name(dicts.industries, f.industryId)],
    ["productType", name(dicts.productTypes, f.productTypeId)],
    ["model", models.join(", ")],
    ["coop", f.cooperation.map((c) => t.catalog.coop[c]).join(", ")],
    ["employees", f.employeeCount === null ? "" : String(f.employeeCount)],
    ["capacity", f.capacityText.trim()],
  ];
  return rows.map(([key, value]) => ({ key, label: labels[key], value: value || EMPTY }));
}

/** "Ad — Tip | Zavod.az"; a tab page names the tab instead of the type (each tab is its own canonical URL). */
export const factoryTitle = (name: string, typeLabel: string, tabLabel?: string) => `${name} — ${tabLabel ?? typeLabel} | ${SITE_NAME}`;

/** Meta description from the about text: one line, ≤ 160 characters, cut at a word. */
export function factoryDescription(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return (space > max / 2 ? cut.slice(0, space) : cut).trimEnd() + "…";
}

const PAGE = /^[1-9]\d{0,4}$/;

/** `?page=N` (vacancies): a positive integer, anything else is page 1. */
export function parsePageParam(v: string | string[] | undefined): number {
  const s = Array.isArray(v) ? v[0] : v;
  return s !== undefined && PAGE.test(s) && Number(s) <= 9999 ? Number(s) : 1;
}

const CURRENCY_SIGN: Record<string, string> = { AZN: "₼" };

/** Figma "1200₼"; another currency keeps its code. null when the salary is not stated. */
export function salaryText(salary: number | null, currency: string): string | null {
  if (salary === null) return null;
  const sign = CURRENCY_SIGN[currency];
  return sign ? `${salary}${sign}` : `${salary} ${currency}`;
}

const DAY = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Baku", day: "2-digit", month: "2-digit", year: "numeric" });

/** "05.05.2025" (Baku time). */
export const formatDay = (d: Date) => DAY.format(d).replace(/\//g, ".");

/** "www.agrotradesupply.az" — the link text without scheme and trailing slash. */
export const websiteLabel = (url: string) => url.replace(/^https?:\/\//i, "").replace(/\/$/, "");

/** schema.org Organization (controller: no AggregateRating — Google's self-serving review rule). */
export function organizationJsonLd(f: FactoryPage, opts: { url: string; origin: string; description: string }) {
  const sameAs = [f.website, ...SOCIALS.map((k) => f.socials[k])].filter((v): v is string => Boolean(v));
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: f.name,
    ...(f.legalName ? { legalName: f.legalName } : {}),
    url: opts.url,
    ...(opts.description ? { description: opts.description } : {}),
    ...(f.logo ? { logo: opts.origin + mediaSrc(f.logo, 320) } : {}),
    ...(f.cover ? { image: opts.origin + mediaSrc(f.cover, 960) } : {}),
    ...(f.phone ? { telephone: f.phone } : {}),
    ...(f.email ? { email: f.email } : {}),
    ...(f.address ? { address: f.address } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

const MEGABYTE = 1024 * 1024;

/** "2.5 MB" in the page language (Intl, unit megabyte); a tiny file shows "0.1 MB", never "0 MB". */
export function formatFileSize(bytes: number, lang: Locale): string {
  return new Intl.NumberFormat(lang, { style: "unit", unit: "megabyte", unitDisplay: "short", maximumFractionDigits: 1 }).format(Math.max(0.1, bytes / MEGABYTE));
}

/** "Məhsulun adı — Zavod | Zavod.az" */
export const productTitle = (name: string, factoryName: string) => `${name} — ${factoryName} | ${SITE_NAME}`;

/** schema.org Product (controller: name, image, description, brand = the factory; no offers, no ratings). */
export function productJsonLd(p: ProductPage, factory: { name: string }, opts: { url: string; origin: string }) {
  const images = p.images.map((m) => opts.origin + mediaSrc(m, 960));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    url: opts.url,
    ...(images.length ? { image: images } : {}),
    ...(p.description.trim() ? { description: p.description.trim() } : {}),
    brand: { "@type": "Brand", name: factory.name },
  };
}
