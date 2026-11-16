"use server";

import { z } from "zod";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { locales } from "@/i18n/config";
import { requireAdmin } from "@/lib/auth";
import { invalidateTags, pageTag } from "@/lib/cache/tags";
import { parseRichDoc } from "@/features/pages/doc-schema";
import { PAGE_KEYS, type PageKey, type RichDoc } from "@/features/pages/types";

export type PageSaveState = { ok?: boolean; error?: string } | undefined;

const loc = (max: number) =>
  z.object(Object.fromEntries(locales.map((l) => [l, z.string().trim().max(max, `Ən çox ${max} simvol`)])) as Record<"az" | "en" | "ru", z.ZodString>);
const BODY_KEYS = new Set<string>(["terms", "privacy"]);
const MAX_DOC_LENGTH = 200_000;

export async function savePage(_prev: PageSaveState, form: FormData): Promise<PageSaveState> {
  await requireAdmin();
  const key = String(form.get("key")) as PageKey;
  if (!PAGE_KEYS.includes(key)) return { error: "Naməlum səhifə" };
  const get = (k: string) => String(form.get(k) ?? "");
  const group = (prefix: string) => Object.fromEntries(locales.map((l) => [l, get(`${prefix}.${l}`)]));

  const body: Record<string, RichDoc | null> = { az: null, en: null, ru: null };
  // Only the legal pages have a body; for the other keys it stays null whatever was submitted.
  for (const l of BODY_KEYS.has(key) ? locales : []) {
    const raw = get(`body.${l}`);
    if (!raw) continue;
    try {
      const doc = raw.length <= MAX_DOC_LENGTH ? parseRichDoc(JSON.parse(raw)) : null;
      if (!doc) return { error: "Məzmun oxunmadı" };
      body[l] = doc.content?.length ? doc : null;
    } catch {
      return { error: "Məzmun oxunmadı" };
    }
  }

  const parsed = z
    .object({ title: loc(120), intro: loc(600), seo: z.object({ title: loc(70), description: loc(160) }) })
    .safeParse({ title: group("title"), intro: group("intro"), seo: { title: group("seoTitle"), description: group("seoDescription") } });
  if (!parsed.success || !parsed.data.title.az) return { error: "Başlıq (AZ) mütləqdir, uzunluq limitlərini yoxlayın" };

  const value = { key, ...parsed.data, body: body as Record<"az" | "en" | "ru", RichDoc | null> };
  await db
    .insert(pages)
    .values(value)
    .onConflictDoUpdate({ target: pages.key, set: { ...value, updatedAt: new Date() } });
  await invalidateTags([pageTag(key)]);
  return { ok: true };
}
