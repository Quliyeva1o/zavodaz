import "server-only";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { faqItems } from "@/db/schema";
import { FAQ_TAG } from "@/lib/cache/tags";
import type { Localized } from "@/i18n/config";

export type FaqItem = { id: string; question: Localized; answer: Localized; sort: number };

export async function getFaq(): Promise<FaqItem[]> {
  "use cache";
  cacheLife("max");
  cacheTag(FAQ_TAG);
  return db
    .select({ id: faqItems.id, question: faqItems.question, answer: faqItems.answer, sort: faqItems.sort })
    .from(faqItems)
    .where(eq(faqItems.published, true))
    .orderBy(asc(faqItems.sort), asc(faqItems.createdAt));
}
