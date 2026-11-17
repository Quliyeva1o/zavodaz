// No zod, no server imports: also used by client components (filters).
import type { Localized } from "@/i18n/config";

export const FACTORY_TYPES = ["zavod", "fabrik", "sex", "emalatxana", "kombinat", "aqropark"] as const;
export type FactoryType = (typeof FACTORY_TYPES)[number];
export const isFactoryType = (v: string): v is FactoryType => (FACTORY_TYPES as readonly string[]).includes(v);

export const COOPERATION = ["distributor", "partner", "sales"] as const;
export type Cooperation = (typeof COOPERATION)[number];
export const isCooperation = (v: string): v is Cooperation => (COOPERATION as readonly string[]).includes(v);

export const TARIFF_RANK = { standart: 0, premium: 1, vip: 2 } as const;
export const PAGE_SIZE = 15;

export type CatalogSort = "default" | "rating_desc" | "rating_asc";

/** What the page itself fixes (type page, recommended, landing); query parameters cannot override it. */
export type CatalogScope = {
  types?: FactoryType[];
  recommended?: boolean;
  landing?: { kind: "city" | "industry"; slug: string };
};

/** Normalised catalog query: dictionary values are slugs (resolved to ids on the server). */
export type CatalogFilter = {
  types: FactoryType[];
  industry: string | null;
  city: string | null;
  product: string | null;
  model: string | null;
  coop: Cooperation | null;
  recommended: boolean;
  sort: CatalogSort;
  page: number;
};

export type Dict = { id: number; slug: string; name: Localized };
export type Dictionaries = { cities: Dict[]; industries: Dict[]; productTypes: Dict[]; productionModels: Dict[] };

export type FactoryCardData = {
  id: string;
  slug: string;
  name: string;
  about: string;
  type: FactoryType;
  verified: boolean;
  ratingAvg: number;
  cover: { id: string; variants: number[]; blur: string; width: number; height: number } | null;
};
