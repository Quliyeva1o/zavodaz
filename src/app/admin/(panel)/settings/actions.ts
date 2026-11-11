"use server";

import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { invalidateTags, SETTINGS_TAG } from "@/lib/cache/tags";
import { SETTINGS_KEY } from "@/features/settings/queries";
import { parseSettingsForm } from "@/features/settings/schema";

export type SaveState = { ok?: boolean; errors?: Record<string, string> } | undefined;

export async function saveSettings(_prev: SaveState, form: FormData): Promise<SaveState> {
  await requireAdmin();
  const parsed = parseSettingsForm(form);
  if (!parsed.ok) return { errors: parsed.errors };
  await db
    .insert(siteSettings)
    .values({ key: SETTINGS_KEY, value: parsed.data })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: parsed.data } });
  await invalidateTags([SETTINGS_TAG]);
  return { ok: true };
}
