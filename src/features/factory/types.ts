// Factory page data shapes. No server imports: also used by client components.
import type { Cooperation, FactoryType } from "@/features/catalog/types";
import type { SocialKey } from "@/features/settings/links";

/** An uploaded image with what `<img>` needs (variants for srcset, intrinsic size against CLS, blur placeholder). */
export type MediaImage = { id: string; variants: number[]; blur: string; width: number; height: number };

export type FactoryStatus = "draft" | "published" | "hidden";

/** Everything the factory shell and its about / media / capabilities tabs show. Dictionary values are ids (see getDictionaries). */
export type FactoryPage = {
  id: string;
  slug: string;
  type: FactoryType;
  status: FactoryStatus;
  name: string;
  legalName: string;
  about: string;
  equipmentText: string;
  employeeCount: number | null;
  capacityText: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  youtubeUrl: string;
  socials: Partial<Record<SocialKey, string>>;
  industryId: number | null;
  productTypeId: number | null;
  cityId: number | null;
  productionModelIds: number[];
  cooperation: Cooperation[];
  verified: boolean;
  ratingAvg: number;
  ratingCount: number;
  updatedAt: Date;
  cover: MediaImage | null;
  logo: MediaImage | null;
  /** "Media" tab photos in admin order (≤ 6). */
  images: MediaImage[];
  certificates: { id: string; title: string; image: MediaImage }[];
  /** PDF catalogues: `/media/<mediaId>/file.pdf` (pdfSrc), `size` in bytes. */
  files: { id: string; title: string; mediaId: string; size: number }[];
};

export type ProductCard = { id: number; slug: string; name: string; description: string; image: MediaImage | null };
export type ProductPage = ProductCard & { factoryId: string; images: MediaImage[]; updatedAt: Date };

export type VacancyCard = {
  id: string;
  slug: string;
  title: string;
  cityId: number | null;
  salary: number | null;
  currency: string;
  employmentType: string;
  publishedAt: Date | null;
  expiresAt: Date | null;
};

export type Paged<T> = { items: T[]; total: number; pageCount: number };

export const PRODUCTS_PAGE_SIZE = 12;
export const VACANCIES_PAGE_SIZE = 8;
export const SIMILAR_PRODUCTS = 6;
