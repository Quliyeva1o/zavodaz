// No zod, no server imports: also used by client components (filters).
export const FACTORY_TYPES = ["zavod", "fabrik", "sex", "emalatxana", "kombinat", "aqropark"] as const;
export type FactoryType = (typeof FACTORY_TYPES)[number];
export const isFactoryType = (v: string): v is FactoryType => (FACTORY_TYPES as readonly string[]).includes(v);

export const COOPERATION = ["distributor", "partner", "sales"] as const;
export type Cooperation = (typeof COOPERATION)[number];
export const isCooperation = (v: string): v is Cooperation => (COOPERATION as readonly string[]).includes(v);

export const TARIFF_RANK = { standart: 0, premium: 1, vip: 2 } as const;
export const PAGE_SIZE = 15;

export type CatalogSort = "default" | "rating_desc" | "rating_asc";
