import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { factoryHref } from "@/i18n/routes";
import type { Dictionaries } from "@/features/catalog/types";
import type { FactoryPage, Paged, VacancyCard as Vacancy } from "@/features/factory/types";
import { factoryFeatures } from "@/features/factory/view";
import { FeatureCards } from "./feature-cards";
import { VacancyCard } from "./vacancy-card";

/** Section title: Subtitle 3 Medium (desktop and mobile alike). */
function Title({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-subtitle-3-medium text-brand-950">
      {children}
    </h2>
  );
}

/** Desktop card (pad 20, r10, gray-200 stroke); on mobile Figma draws the same blocks without a frame. */
const card = "lg:rounded-[10px] lg:border lg:border-gray-200 lg:p-5";

/** Plain text with the admin's line breaks (about, equipment). */
function Prose({ text }: { text: string }) {
  return <p className="whitespace-pre-line text-body-md text-gray-700 [overflow-wrap:anywhere]">{text}</p>;
}

/**
 * Haqqında, Figma 331:10208 / 764:23144: the about text (card, title 12 above), the six facts (16 below), the media
 * preview (24 below; mobile 16): video 462×323 + photos (main 367×260 + thumbs), 24 apart — mobile stacked.
 */
export function AboutTab({ lang, factory: f, dicts }: { lang: Locale; factory: FactoryPage; dicts: Dictionaries }) {
  const t = dict(lang).factory;
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="flex flex-col gap-4">
        {f.about.trim() && (
          <section aria-labelledby="factory-about" className={`flex flex-col gap-3 ${card}`}>
            <Title id="factory-about">{t.aboutTitle}</Title>
            <Prose text={f.about} />
          </section>
        )}
        <FeatureCards items={factoryFeatures(f, dicts, lang)} />
      </div>
    </div>
  );
}

/** Media, Figma 368:12677 / 773:24897: "Video" (893×510, Play 90; mobile 288×186, Play 38), then "Şəkillər" 24 below. */
export function MediaTab({ lang }: { lang: Locale; factory: FactoryPage }) {
  return <Empty>{dict(lang).factory.noMedia}</Empty>;
}

/** Texniki imkanlar, Figma 361:10752 / 773:24643: the equipment list (line breaks kept), then the certificates 24 below. */
export function CapabilitiesTab({ lang, factory: f }: { lang: Locale; factory: FactoryPage }) {
  const t = dict(lang).factory;
  return (
    <div className="flex flex-col gap-8 lg:gap-6">
      <section aria-labelledby="factory-equipment" className={`flex flex-col gap-3 ${card}`}>
        <Title id="factory-equipment">{t.equipment}</Title>
        <Prose text={f.equipmentText.trim() || "-"} />
      </section>
    </div>
  );
}

/**
 * Vakansiyalar, Figma 357:10612 / 770:24132: cards in 2 columns 24 apart (mobile one column 16 apart), 8 per page.
 * "Daha çox göstər" (Figma 368:11002, 893×40 outline button, 24 below) is a `?page=N+1` link: page N shows the
 * first N×8, so it works without JavaScript and the next page keeps the ones already seen.
 */
export function VacanciesTab({
  lang,
  factory: f,
  list,
  page,
}: {
  lang: Locale;
  factory: FactoryPage;
  list: Paged<Vacancy>;
  page: number;
}) {
  const t = dict(lang).factory;
  if (list.items.length === 0) return <Empty>{t.noVacancies}</Empty>;
  return (
    <section aria-label={t.tabs.vacancies} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {list.items.map((v) => (
          <VacancyCard key={v.id} lang={lang} vacancy={v} company={f.legalName || f.name} logo={f.logo} />
        ))}
      </div>
      {page < list.pageCount && (
        <Link
          href={`${factoryHref(f.slug, lang, "vacancies")}?page=${page + 1}`}
          scroll={false}
          className="relative flex h-10 items-center justify-center rounded-[4px] border border-gray-200 px-2.5 text-body-md text-brand-950 after:absolute after:inset-x-0 after:-inset-y-1"
        >
          {t.more}
        </Link>
      )}
    </section>
  );
}

/** Empty state: the catalog's "nothing found" text style (not in Figma). */
function Empty({ children }: { children: ReactNode }) {
  return <p className="py-[60px] text-center text-subtitle-3 text-gray-500 lg:text-subtitle-1">{children}</p>;
}
