import "server-only";
import { asc } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { tariffPlans } from "@/db/schema";
import { TARIFFS_TAG } from "@/lib/cache/tags";
import type { Localized } from "@/i18n/config";

export type TariffCode = "standart" | "premium" | "vip";
export type TariffIcon = "asterisk" | "diamonds-four" | "crown-simple";
export type TariffPlan = {
  code: TariffCode;
  icon: TariffIcon;
  name: Localized;
  priceMonthQ: number;
  priceYearQ: number | null;
  features: Localized<string[]>;
  limits: { products: number | null; vacancies: number | null };
  sort: number;
};

export async function getTariffs(): Promise<TariffPlan[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TARIFFS_TAG);
  const rows = await db.select().from(tariffPlans).orderBy(asc(tariffPlans.sort));
  return rows as TariffPlan[];
}
