import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { href } from "@/i18n/routes";
import { Icon } from "@/components/ui/icon";

const ITEMS = ["terms", "privacy", "help"] as const;
export type LegalKey = (typeof ITEMS)[number];

/**
 * Figma 153:4020 (Terms/Privacy, gap 16) / 153:4190 (Help, gap 20) / mobile 685:21541, 685:21667: card r10, gray-50,
 * 1px gray-200 stroke INSIDE (takes no layout room → padding = Figma padding − 1), pad 20 (mobile 16); rows 26 high:
 * subtitle-2 + CaretRight 24. Mobile Help (685:21667) draws Subtitle 3 18/24.3 in 24px rows (Figma rounds the text
 * box to 24) → total 144. The 44px hit area is a `before:` overlay, so the drawn size stays 1:1.
 */
export function LegalNav({ lang, active, gap }: { lang: Locale; active: LegalKey; gap: 16 | 20 }) {
  const t = dict(lang);
  return (
    <nav
      aria-label={t.legalNav}
      className={`flex w-full flex-col rounded-[10px] border border-gray-200 bg-gray-50 p-[15px] lg:p-[19px] ${gap === 20 ? "gap-5" : "gap-4"}`}
    >
      {ITEMS.map((k) => (
        <a
          key={k}
          href={href(k, lang)}
          aria-current={k === active ? "page" : undefined}
          className={`relative flex items-center gap-4 ${gap === 20 ? "text-subtitle-3 max-lg:leading-6 max-lg:before:-inset-y-[10px] lg:text-subtitle-2" : "text-subtitle-2"} before:absolute before:inset-x-0 before:-inset-y-[9px] ${k === active ? "text-brand-950" : "text-gray-500"}`}
        >
          <span className="flex-1">{t.pages[k]}</span>
          <Icon name="caret-right" size={24} />
        </a>
      ))}
    </nav>
  );
}
