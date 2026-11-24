import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { mediaSrc, mediaSrcSet } from "@/features/media/url";
import type { FactoryPage } from "@/features/factory/types";
import { Stars } from "@/components/catalog/stars";
import { Icon } from "@/components/ui/icon";
import { RateButton } from "./rate-button";

/**
 * Figma 331:10177 (desktop) / 762:23093 (mobile). Cover 893×210 r10 (mobile 288×120) with the "Təsdiqlənib" pill 17
 * from its top-right corner (mobile 10); the row under it starts 60 above the cover's bottom (mobile 40): logo 120
 * (mobile 60) with a 4px (2px) white ring drawn outside, then the name (H4 / Mob Subtitle 2) and type (Subtitle 1 /
 * Caption) 8 (4) apart. Desktop: rating (H5 + 24 stars) and "Qiymətləndir" (180×40) in a 180 column at the right,
 * bottom-aligned; mobile: both centred under the name, the button full width.
 * Figma's DiamondsFour badge (tariff) is not shown: the tariff badge belongs to step 5.
 * The heading is the legal name when there is one ("Agro Trade Supply MMC"; the breadcrumb shows the short name).
 */
export function FactoryHeader({ lang, factory, className = "" }: { lang: Locale; factory: FactoryPage; className?: string }) {
  const t = dict(lang);
  const { cover, logo } = factory;
  const rating = factory.ratingAvg.toFixed(1);
  return (
    <section aria-labelledby="factory-name" data-figma="factory-header" className={`flex flex-col ${className}`}>
      <div
        className="relative h-[120px] overflow-hidden rounded-[10px] bg-photo-placeholder bg-cover lg:h-[210px]"
        style={cover ? { backgroundImage: `url("${cover.blur}")` } : undefined}
      >
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element -- own /media route with WebP variants and blur placeholder
          <img
            src={mediaSrc(cover, 960)}
            srcSet={mediaSrcSet(cover)}
            sizes="(min-width:1440px) 893px, (min-width:1024px) 62vw, 100vw"
            width={cover.width}
            height={cover.height}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
        )}
        {factory.verified && (
          <div className="absolute right-2.5 top-2.5 flex items-center gap-[3px] rounded-full bg-white px-[7.5px] py-[4.5px] text-overline font-normal text-gray-700 lg:right-[17px] lg:top-[17px] lg:gap-1 lg:px-2.5 lg:py-1.5 lg:text-body-sm">
            <Icon name="seal-check" size={20} className="size-3.5 shrink-0 lg:size-5" />
            {t.catalog.verified}
          </div>
        )}
      </div>
      <div className="relative -mt-10 flex flex-col gap-4 pl-3 lg:-mt-[60px] lg:flex-row lg:items-end lg:pl-8">
        <div className="flex min-w-0 flex-col gap-2.5 lg:flex-1 lg:gap-4">
          <div className="size-[60px] shrink-0 overflow-hidden rounded-full bg-gray-50 outline-2 outline-white lg:size-[120px] lg:outline-4">
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element -- own /media route
              <img
                src={mediaSrc(logo, 240)}
                srcSet={mediaSrcSet(logo)}
                sizes="(min-width:1024px) 120px, 60px"
                width={120}
                height={120}
                alt={t.factory.logo.replace("{name}", factory.name)}
                decoding="async"
                className="size-full object-cover"
              />
            )}
          </div>
          <div className="flex flex-col gap-1 lg:gap-2">
            <h1 id="factory-name" className="text-mob-subtitle-2 text-brand-950 [overflow-wrap:anywhere] lg:text-h4">
              {factory.legalName || factory.name}
            </h1>
            <p className="text-caption-tight text-gray-700 lg:text-subtitle-1">{t.factoryType[factory.type]}</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2.5 lg:w-[180px] lg:shrink-0 lg:items-end lg:gap-4">
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-mob-subtitle text-gray-700 lg:text-h5">
              {rating}
            </span>
            <Stars rating={factory.ratingAvg} label={t.catalog.rating.replace("{r}", rating)} />
          </div>
          <RateButton label={t.factory.rate} />
        </div>
      </div>
    </section>
  );
}
