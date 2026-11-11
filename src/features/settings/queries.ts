import "server-only";
import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { SETTINGS_TAG } from "@/lib/cache/tags";
import { mergeSettings, type SiteSettings } from "./schema";

export const SETTINGS_KEY = "site";

/** Cached until an admin saves the settings (invalidateTags([SETTINGS_TAG])). */
export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheLife("max");
  cacheTag(SETTINGS_TAG);
  const [row] = await db
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, SETTINGS_KEY))
    .limit(1);
  return mergeSettings(row?.value);
}
