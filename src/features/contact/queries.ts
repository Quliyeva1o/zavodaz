import "server-only";
import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { CONTACT_TAG } from "@/lib/cache/tags";
import { mergeContactSettings, type ContactSettings } from "./settings";

export const CONTACT_SETTINGS_KEY = "contact";

export async function getContactSettings(): Promise<ContactSettings> {
  "use cache";
  cacheLife("max");
  cacheTag(CONTACT_TAG);
  const [row] = await db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, CONTACT_SETTINGS_KEY)).limit(1);
  return mergeContactSettings(row?.value);
}
