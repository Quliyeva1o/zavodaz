import { z } from "zod";
import { locales, type Localized } from "@/i18n/config";
import { SOCIALS, type SocialKey } from "./links";

export { SOCIALS, telHref, whatsappHref, type SocialKey } from "./links";

const localized = (max: number) =>
  z.object(Object.fromEntries(locales.map((l) => [l, z.string().trim().max(max)])) as Record<keyof Localized, z.ZodString>);
const urlOrEmpty = z.union([z.literal(""), z.url({ protocol: /^https?$/ })]);


export const siteSettingsSchema = z.object({
  phone: z.string().trim().min(5).max(30),
  phone2: z.string().trim().max(30),
  whatsapp: z
    .string()
    .transform((v) => v.replace(/[\s()-]/g, ""))
    .pipe(z.string().regex(/^\+?\d{9,15}$/, "Nömrə formatı: +994501234567")),
  email: z.email("E-mail düzgün deyil"),
  address: localized(200),
  copyright: localized(120),
  socials: z.object(Object.fromEntries(SOCIALS.map((s) => [s, urlOrEmpty])) as Record<SocialKey, typeof urlOrEmpty>),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

const same = (text: string): Localized => ({ az: text, en: text, ru: text });

/** Exactly the texts drawn in Figma, so a fresh install (and the visual test) matches the design. */
export const defaultSiteSettings: SiteSettings = {
  phone: "+994 000 00 00",
  phone2: "+994 000 00 00",
  whatsapp: "+994000000000",
  email: "youremailhere@partner.az",
  address: same("Lorem ipsum street 00, AZ 000"),
  copyright: {
    az: "©Bütün hüquqlar qorunur. Zavod.az, 2025",
    en: "©All rights reserved. Zavod.az, 2025",
    ru: "©Все права защищены. Zavod.az, 2025",
  },
  socials: {
    facebook: "https://www.facebook.com/",
    instagram: "https://www.instagram.com/",
    linkedin: "https://www.linkedin.com/",
    x: "https://x.com/",
    youtube: "https://www.youtube.com/",
    tiktok: "https://www.tiktok.com/",
  },
};

/** Stored JSON over the defaults; anything invalid falls back to the defaults as a whole. */
export function mergeSettings(stored: unknown): SiteSettings {
  if (!stored || typeof stored !== "object") return defaultSiteSettings;
  const s = stored as Partial<SiteSettings>;
  const candidate = {
    ...defaultSiteSettings,
    ...s,
    address: { ...defaultSiteSettings.address, ...s.address },
    copyright: { ...defaultSiteSettings.copyright, ...s.copyright },
    socials: { ...defaultSiteSettings.socials, ...s.socials },
  };
  const parsed = siteSettingsSchema.safeParse(candidate);
  if (!parsed.success) {
    console.error("Sayt ayarları yanlışdır, standart dəyərlər istifadə olunur:", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    return defaultSiteSettings;
  }
  return parsed.data;
}

/** Admin form (field names like `address.az`, `socials.x`) → validated settings. */
export function parseSettingsForm(form: FormData) {
  const get = (k: string) => String(form.get(k) ?? "");
  const group = <K extends string>(prefix: string, keys: readonly K[]) =>
    Object.fromEntries(keys.map((k) => [k, get(`${prefix}.${k}`)])) as Record<K, string>;
  const parsed = siteSettingsSchema.safeParse({
    phone: get("phone"),
    phone2: get("phone2"),
    whatsapp: get("whatsapp"),
    email: get("email"),
    address: group("address", locales),
    copyright: group("copyright", locales),
    socials: group("socials", SOCIALS),
  });
  if (parsed.success) return { ok: true as const, data: parsed.data };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) errors[issue.path.join(".")] ??= issue.message;
  return { ok: false as const, errors };
}
