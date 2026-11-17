import type { Locale } from "@/i18n/config";
import type { PageContent } from "./types";

export const SITE_NAME = "Zavod.az";

/**
 * <title> of a static page, preferring the requested language:
 * its SEO title → "<its page title> | Zavod.az" → the AZ SEO title → "<AZ page title> | Zavod.az".
 */
export function pageSeoTitle(p: Pick<PageContent, "title" | "seo">, lang: Locale): string {
  const seo = p.seo.title[lang]?.trim();
  if (seo) return seo;
  const title = p.title[lang]?.trim();
  if (title) return `${title} | ${SITE_NAME}`;
  return p.seo.title.az.trim() || `${p.title.az.trim()} | ${SITE_NAME}`;
}
