import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { factoryHref } from "@/i18n/routes";
import { mediaSrc, mediaSrcSet } from "@/features/media/url";
import type { FactoryCardData } from "@/features/catalog/types";
import { Icon } from "@/components/ui/icon";
import { Stars } from "./stars";

/**
 * Figma desktop "Card" 281:7099 (315×429) and mobile "Mob" 736:23882 (288×320):
 * white, shadow-card, r24 (mobile r20), pad 14/14/16/14 (mobile 12/12/14/12), gap 10; image 287×213 r10 (mobile 264×195);
 * "Təsdiqlənib" badge in the image corner (fixed 82 / 100 wide, content centred like Figma's Frame 16 — the text is wider
 * than the padding leaves, so it overflows evenly); type · name · description (desktop 2 lines, mobile 1); stars;
 * "Ətraflı" (desktop only). Text boxes as Figma rounds them: name 20 / 28 (line 20.48 / 28.16), mobile description 17
 * (line 16.8) — so the card is exactly 320 / 429 high and rows do not drift.
 * One link per card: the name, stretched over the whole card.
 */
export function FactoryCard({ data, lang, priority = false }: { data: FactoryCardData; lang: Locale; priority?: boolean }) {
  const t = dict(lang);
  const c = t.catalog;
  const cover = data.cover;
  return (
    <article
      data-figma="card"
      data-type={data.type}
      className="relative flex flex-col gap-2.5 rounded-[20px] bg-white px-3 pb-3.5 pt-3 shadow-card lg:rounded-3xl lg:px-3.5 lg:pb-4 lg:pt-3.5"
    >
      <div
        className="relative aspect-[264/195] w-full overflow-hidden rounded-[10px] bg-photo-placeholder bg-cover lg:aspect-[287/213]"
        style={cover ? { backgroundImage: `url("${cover.blur}")` } : undefined}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- own /media route with WebP variants and blur placeholder
          <img
            src={mediaSrc(cover, 320)}
            srcSet={mediaSrcSet(cover)}
            sizes="(min-width:1024px) 287px, 264px"
            width={287}
            height={213}
            alt=""
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        {data.verified ? (
          <div className="absolute right-1.5 top-1.5 flex w-[82px] items-center justify-center gap-0.5 rounded-full bg-white px-[7.5px] py-[3px] text-overline font-normal text-gray-700 lg:right-3.5 lg:top-3.5 lg:w-[100px] lg:gap-1 lg:px-2.5 lg:py-1 lg:text-caption-tight">
            <Icon name="seal-check" size={16} className="size-3.5 shrink-0 lg:size-4" />
            <span className="shrink-0">{c.verified}</span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2.5 lg:gap-4">
        <div className="flex flex-col gap-1 lg:gap-1.5">
          <span className="text-overline uppercase text-gray-500">{t.factoryType[data.type]}</span>
          <h3 className="h-5 overflow-x-clip text-ellipsis whitespace-nowrap text-mob-subtitle-2 text-brand-950 lg:h-7 lg:text-subtitle-1-medium">
            <a href={factoryHref(data.slug, lang)} className="after:absolute after:inset-0 after:rounded-[inherit]">
              {data.name}
            </a>
          </h3>
          <p className="line-clamp-1 min-h-[17px] text-caption-tight text-gray-700 lg:line-clamp-2 lg:min-h-[42px] lg:text-body-sm">{data.about}</p>
        </div>
        <Stars rating={data.ratingAvg} label={c.rating.replace("{r}", String(data.ratingAvg))} />
        <span aria-hidden className="hidden items-center gap-1.5 text-body-md text-brand-950 lg:flex">
          {c.more}
          <Icon name="caret-right" size={20} />
        </span>
      </div>
    </article>
  );
}
