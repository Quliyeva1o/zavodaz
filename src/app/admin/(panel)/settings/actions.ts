"use server";

import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { invalidateTags, SETTINGS_TAG } from "@/lib/cache/tags";
import { SETTINGS_KEY } from "@/features/settings/queries";
import { locales } from "@/i18n/config";
import { parseSettingsForm, SOCIALS, type SiteSettings } from "@/features/settings/schema";

export type SaveState = { ok?: boolean; errors?: Record<string, string>; values?: SiteSettings } | undefined;

/** Raw submitted strings, so a failed save keeps what the admin typed. */
function submittedValues(form: FormData): SiteSettings {
  const get = (k: string) => String(form.get(k) ?? "");
  const group = <K extends string>(prefix: string, keys: readonly K[]) =>
    Object.fromEntries(keys.map((k) => [k, get(`${prefix}.${k}`)])) as Record<K, string>;
  return {
    phone: get("phone"),
    phone2: get("phone2"),
    whatsapp: get("whatsapp"),
    email: get("email"),
    address: group("address", locales),
    copyright: group("copyright", locales),
    socials: group("socials", SOCIALS),
  };
}

export async function saveSettings(_prev: SaveState, form: FormData): Promise<SaveState> {
  await requireAdmin();
  const parsed = parseSettingsForm(form);
  if (!parsed.ok) return { errors: parsed.errors, values: submittedValues(form) };
  await db
    .insert(siteSettings)
    .values({ key: SETTINGS_KEY, value: parsed.data })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: parsed.data } });
  await invalidateTags([SETTINGS_TAG]);
  return { ok: true, values: parsed.data };
}
