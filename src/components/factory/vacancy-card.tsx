import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { href } from "@/i18n/routes";
import { mediaSrc } from "@/features/media/url";
import type { MediaImage, VacancyCard as Vacancy } from "@/features/factory/types";
import { formatDay, salaryText } from "@/features/factory/view";

/**
 * Figma vacancy card 357:10585 (desktop 435 wide, pad 20, r10, shadow-vacancy) / 770:24250 (mobile pad 12): date
 * (body-sm / caption, gray-500) 6 above the title (Subtitle 2 Medium / Mob Subtitle 2); salary (H2 / Mob H2,
 * brand-600) + "/Ay" right-aligned 32 (24) lower; a line; the factory logo (30 / 24) and name. The title links to the
 * vacancy page (step 8; until then that URL is a 404), stretched over the card.
 */
export function VacancyCard({ lang, vacancy: v, company, logo }: { lang: Locale; vacancy: Vacancy; company: string; logo: MediaImage | null }) {
  const t = dict(lang);
  const salary = salaryText(v.salary, v.currency);
  return (
    <article className="relative flex flex-col gap-3 rounded-[10px] bg-white p-3 shadow-vacancy lg:gap-6 lg:p-5">
      <div className="flex flex-col gap-6 lg:gap-8">
        <div className="flex flex-col gap-1.5">
          {v.publishedAt && (
            <time dateTime={v.publishedAt.toISOString()} className="text-caption-tight text-gray-500 lg:text-body-sm">
              {formatDay(v.publishedAt)}
            </time>
          )}
          <h3 className="text-mob-subtitle-2 text-brand-950 [overflow-wrap:anywhere] lg:text-subtitle-2-medium">
            <a href={href("vacancies", lang, v.slug)} className="after:absolute after:inset-0 after:rounded-[inherit]">
              {v.title}
            </a>
          </h3>
        </div>
        {salary && (
          <p className="flex items-end justify-end gap-1.5">
            <span className="text-mob-h2 text-brand-600 lg:text-h2">{salary}</span>
            <span className="pb-[3px] text-body-sm text-gray-500 lg:text-subtitle-3">{t.tariffs.perMonth}</span>
          </p>
        )}
      </div>
      <div aria-hidden className="-my-[0.5px] h-px bg-gray-200" />
      <div className="flex items-center gap-2.5">
        <span className="size-6 shrink-0 overflow-hidden rounded-full bg-gray-50 lg:size-[30px]">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element -- own /media route
            <img src={mediaSrc(logo, 64)} width={30} height={30} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          )}
        </span>
        <span className="min-w-0 truncate text-body-sm text-gray-700 lg:text-body-md">{company}</span>
      </div>
    </article>
  );
}
