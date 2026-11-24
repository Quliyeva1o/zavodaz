// Admin labels (AZ). No zod, no server code: shared by the pages and the client form.
import { az } from "@/i18n/dictionaries/az";

export const TYPE_LABELS = az.factoryType;
export const COOP_LABELS = az.catalog.coop;
export const STATUS_LABELS = { draft: "Qaralama", published: "Dərc olunub", hidden: "Gizlədilib" } as const;
export const TARIFF_LABELS = { standart: "Standart", premium: "Premium", vip: "VIP" } as const;
