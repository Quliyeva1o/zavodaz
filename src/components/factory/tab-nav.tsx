import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { FACTORY_TABS, factoryHref, type FactoryTab } from "@/i18n/routes";

/**
 * Figma 331:10207 (desktop) / 767:23295 (mobile). Desktop: 5 links spread over 893 (60 high), each pad 16/20,
 * Subtitle 2; the current one brand-950 with a 2px brand-500 underline (drawn inside the box), the others gray-500.
 * Mobile: pills 36 high, pad 10/16, r-full, body-sm, wrapping 10 apart; current brand-200, others gray-50 + gray-200
 * stroke. (The plan said "horizontal scroll" on mobile; Figma wraps the pills into two rows, which we follow.)
 * Every tab is its own URL (canonical), so these are plain links with `aria-current="page"`.
 */
export function TabNav({
  lang,
  slug,
  current,
  preview,
  className = "",
}: {
  lang: Locale;
  slug: string;
  current: FactoryTab;
  preview: boolean;
  className?: string;
}) {
  const t = dict(lang).factory;
  return (
    <nav aria-label={t.sections} data-figma="factory-tabs" className={className}>
      <ul className="flex flex-wrap gap-2.5 lg:h-[60px] lg:flex-nowrap lg:items-center lg:justify-between lg:gap-0">
        {FACTORY_TABS.map((tab) => {
          const active = tab === current;
          return (
            <li key={tab}>
              <a
                href={factoryHref(slug, lang, tab) + (preview ? "?preview=1" : "")}
                aria-current={active ? "page" : undefined}
                className={`flex h-9 items-center whitespace-nowrap rounded-full border px-4 text-body-sm text-brand-950 lg:h-[58px] lg:rounded-none lg:border-0 lg:border-b-2 lg:bg-transparent lg:px-5 lg:pb-3.5 lg:pt-4 lg:text-subtitle-2 ${
                  active ? "border-transparent bg-brand-200 lg:border-brand-500" : "border-gray-200 bg-gray-50 lg:border-transparent lg:text-gray-500"
                }`}
              >
                {t.tabs[tab]}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
