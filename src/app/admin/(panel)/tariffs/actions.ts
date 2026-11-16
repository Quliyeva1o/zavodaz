"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tariffPlans } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { invalidateTags, TARIFFS_TAG } from "@/lib/cache/tags";
import { parseTariff, rawFromForm, type TariffRaw } from "@/features/tariffs/admin";

export type TariffState = { ok?: boolean; error?: string; errors?: Record<string, string>; values?: TariffRaw } | undefined;

const CODES = new Set(["standart", "premium", "vip"]);

export async function saveTariff(_prev: TariffState, form: FormData): Promise<TariffState> {
  await requireAdmin();
  const values = rawFromForm(form);
  const code = String(form.get("code") ?? "");
  if (!CODES.has(code)) return { error: "Naməlum tarif", values };
  const parsed = parseTariff(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const { name, priceMonthQ, priceYearQ, features, limits } = parsed.data;
  const updated = await db
    .update(tariffPlans)
    .set({ name, priceMonthQ, priceYearQ, features, limits })
    .where(eq(tariffPlans.code, code))
    .returning({ code: tariffPlans.code });
  if (updated.length === 0) return { error: "Tarif bazada tapılmadı", values };
  await invalidateTags([TARIFFS_TAG]);
  return { ok: true, values };
}
