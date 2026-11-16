import { pick, type Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { formatPrice } from "@/features/tariffs/format";
import type { TariffPlan } from "@/features/tariffs/queries";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/**
 * Figma 157:2313 / 157:2335 / 157:2370 (desktop 427 wide) and mobile 696:19826 / 19848 / 19883 (288 wide):
 * outer r16 gray-50 pad 10 (mobile 10/10/20/10), white r13 card with shadow, then the feature list.
 * The free plan has no button but keeps the same card height (hidden button in Figma).
 */
export function TariffCard({ plan, lang, joinHref }: { plan: TariffPlan; lang: Locale; joinHref: string }) {
  const t = dict(lang).tariffs;
  const free = plan.priceMonthQ === 0;
  const features = plan.features[lang]?.length ? plan.features[lang] : plan.features.az; // empty EN/RU → AZ
  return (
    <article className="flex flex-col gap-6 rounded-[16px] bg-gray-50 px-2.5 pb-5 pt-2.5 lg:min-h-[559px] lg:flex-1 lg:basis-0 lg:p-2.5">
      <div className="flex min-h-[170px] flex-col gap-6 rounded-[13px] bg-white p-3 shadow-[0_16px_40px_0_rgba(119,127,168,0.15)] lg:min-h-[218px] lg:p-4">
        <div className="flex flex-col gap-8 lg:gap-12">
          <div className="flex items-center gap-2">
            <Icon name={plan.icon} size={24} className="lg:size-7" />
            <h2 className="text-mob-subtitle text-brand-950 lg:text-h5">{pick(plan.name, lang)}</h2>
          </div>
          <div className="flex items-end gap-1.5 lg:gap-2.5">
            {/* CSS letter-spacing also follows the last glyph, a Figma text box (157:2342) does not include it: the margin
                gives it back so "/Ay" sits gap 10 (mobile 6) after the Figma box. */}
            <span className="mr-[calc(-1*var(--text-mob-h2--letter-spacing))] text-mob-h2 text-brand-950 lg:mr-[calc(-1*var(--text-h2--letter-spacing))] lg:text-h2">
              {free ? t.free : formatPrice(plan.priceMonthQ)}
            </span>
            {free ? null : <span className="text-body-sm text-gray-500 lg:text-subtitle-1">{t.perMonth}</span>}
          </div>
        </div>
        {free ? null : (
          <a href={joinHref} rel="nofollow" className={buttonClass("primary", "responsive", "w-full")}>
            {t.join}
          </a>
        )}
      </div>
      <ul className="flex flex-col gap-4 lg:px-4">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-1.5 text-body-sm text-gray-700">
            <Icon name="check-circle" size={20} className="shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
