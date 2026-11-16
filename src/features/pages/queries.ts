import "server-only";
import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { pageTag } from "@/lib/cache/tags";
import { defaultPages } from "./defaults";
import { PAGE_KEYS, type PageContent, type PageKey } from "./types";

/** Cached until an admin saves the page (invalidateTags([pageTag(key)])). Missing row → seeded defaults. */
export async function getPage(key: PageKey): Promise<PageContent> {
  "use cache";
  cacheLife("max");
  cacheTag(pageTag(key));
  const [row] = await db.select().from(pages).where(eq(pages.key, key)).limit(1);
  return row ? { ...row, key } : defaultPages[key];
}

/** Last admin save (or seed) of every page, as ISO strings — for sitemap <lastmod>. One cached query. */
export async function getPagesUpdatedAt(): Promise<Partial<Record<PageKey, string>>> {
  "use cache";
  cacheLife("max");
  for (const key of PAGE_KEYS) cacheTag(pageTag(key));
  const rows = await db.select({ key: pages.key, updatedAt: pages.updatedAt }).from(pages);
  return Object.fromEntries(rows.map((r) => [r.key, r.updatedAt.toISOString()]));
}
