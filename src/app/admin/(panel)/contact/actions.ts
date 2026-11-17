"use server";

import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { CONTACT_TAG, invalidateTags } from "@/lib/cache/tags";
import { CONTACT_SETTINGS_KEY } from "@/features/contact/queries";
import { parseContactSettings, rawFromForm, rawFromSettings, type ContactRaw } from "@/features/contact/admin";

export type ContactSaveState = { ok?: boolean; errors?: Record<string, string>; values?: ContactRaw } | undefined;

export async function saveContactSettings(_prev: ContactSaveState, form: FormData): Promise<ContactSaveState> {
  await requireAdmin();
  const values = rawFromForm(form);
  const parsed = parseContactSettings(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  await db
    .insert(siteSettings)
    .values({ key: CONTACT_SETTINGS_KEY, value: parsed.data })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: parsed.data } });
  await invalidateTags([CONTACT_TAG]);
  return { ok: true, values: rawFromSettings(parsed.data) };
}
