import type { Localized } from "@/i18n/config";

export type RichMark = { type: string; attrs?: Record<string, unknown> };
export type RichNode = { type: string; attrs?: Record<string, unknown>; content?: RichNode[]; text?: string; marks?: RichMark[] };
export type RichDoc = { type: "doc"; content?: RichNode[] };

export type PageKey = "terms" | "privacy" | "help" | "tariffs" | "contact";
export const PAGE_KEYS: PageKey[] = ["terms", "privacy", "help", "tariffs", "contact"];

export type PageContent = {
  key: PageKey;
  title: Localized;
  intro: Localized;
  body: Localized<RichDoc | null>;
  seo: { title: Localized; description: Localized };
};
