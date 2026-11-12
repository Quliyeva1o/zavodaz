import "server-only";
import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { pageTag } from "@/lib/cache/tags";
import { defaultPages } from "./defaults";
import type { PageContent, PageKey } from "./types";

/** Cached until an admin saves the page (invalidateTags([pageTag(key)])). Missing row → seeded defaults. */
export async function getPage(key: PageKey): Promise<PageContent> {
  "use cache";
  cacheLife("max");
  cacheTag(pageTag(key));
  const [row] = await db.select().from(pages).where(eq(pages.key, key)).limit(1);
  return row ? { ...row, key } : defaultPages[key];
}
