"use server";

import { asc, eq, max, not } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { faqItems } from "@/db/schema";
import { locales } from "@/i18n/config";
import { requireAdmin } from "@/lib/auth";
import { FAQ_TAG, invalidateTags } from "@/lib/cache/tags";

export type FaqSaveState = { ok?: boolean; error?: string } | undefined;

const loc = (max: number) =>
  z.object(Object.fromEntries(locales.map((l) => [l, z.string().trim().max(max)])) as Record<"az" | "en" | "ru", z.ZodString>);
const faqSchema = z.object({ id: z.uuid().optional(), question: loc(300), answer: loc(3000), published: z.boolean() });

export async function saveFaqItem(_prev: FaqSaveState, form: FormData): Promise<FaqSaveState> {
  await requireAdmin();
  const get = (k: string) => String(form.get(k) ?? "");
  const group = (prefix: string) => Object.fromEntries(locales.map((l) => [l, get(`${prefix}.${l}`)]));
  const parsed = faqSchema.safeParse({
    id: get("id") || undefined,
    question: group("question"),
    answer: group("answer"),
    published: form.get("published") === "on",
  });
  if (!parsed.success || !parsed.data.question.az || !parsed.data.answer.az) {
    return { error: "Sual (AZ) və Cavab (AZ) mütləqdir, uzunluq limitlərini yoxlayın" };
  }
  const { id, question, answer, published } = parsed.data;
  if (id) {
    const updated = await db.update(faqItems).set({ question, answer, published }).where(eq(faqItems.id, id)).returning({ id: faqItems.id });
    if (updated.length === 0) return { error: "Sual tapılmadı" };
  } else {
    const [{ top }] = await db.select({ top: max(faqItems.sort) }).from(faqItems);
    await db.insert(faqItems).values({ question, answer, published, sort: (top ?? 0) + 1 });
  }
  await invalidateTags([FAQ_TAG]);
  return { ok: true };
}

const idSchema = z.uuid();

export async function deleteFaqItem(id: string): Promise<void> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return;
  await db.delete(faqItems).where(eq(faqItems.id, id));
  await invalidateTags([FAQ_TAG]);
}

export async function toggleFaqItem(id: string): Promise<void> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return;
  await db.update(faqItems).set({ published: not(faqItems.published) }).where(eq(faqItems.id, id));
  await invalidateTags([FAQ_TAG]);
}

/** Swaps `sort` with the neighbour in the list order (sort, then createdAt), inside one transaction. */
export async function moveFaqItem(id: string, dir: "up" | "down"): Promise<void> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success || (dir !== "up" && dir !== "down")) return;
  await db.transaction(async (tx) => {
    // Renumber first so equal / gapped `sort` values cannot make the swap a no-op.
    const rows = await tx.select({ id: faqItems.id }).from(faqItems).orderBy(asc(faqItems.sort), asc(faqItems.createdAt));
    const index = rows.findIndex((r) => r.id === id);
    const neighbour = dir === "up" ? index - 1 : index + 1;
    if (index === -1 || neighbour < 0 || neighbour >= rows.length) return;
    const order = rows.map((r) => r.id);
    [order[index], order[neighbour]] = [order[neighbour], order[index]];
    for (const [position, itemId] of order.entries()) {
      await tx.update(faqItems).set({ sort: position + 1 }).where(eq(faqItems.id, itemId));
    }
  });
  await invalidateTags([FAQ_TAG]);
}
