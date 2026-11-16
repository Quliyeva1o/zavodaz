import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { getSiteSettings } from "@/features/settings/queries";
import { SOCIALS, telHref, whatsappHref } from "@/features/settings/links";
import { Icon, type IconName, SocialIcon } from "@/components/ui/icon";

const SOCIAL_LABELS = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", x: "X", youtube: "YouTube", tiktok: "TikTok" };

/**
 * Figma 153:4622 (desktop) / 692:19346 (mobile). Blocks: desktop padding 16/0, gap 14 around the 1px
 * gray-200 lines; mobile no padding, gap 20. Title row: icon 24 + gap 6 + Subtitle 2/Medium 20/26; value
 * Body 16/24 gray-700 in an 18px box (as drawn), title → value 10. Socials: 44 circles gap 6 (desktop),
 * 40 spread over the width (mobile). WhatsApp pill (153:4657 / 692:19382): radius full, 2px stroke,
 * padding 16/24; desktop hugs its content (icon 30, Subtitle 3/Medium 18), mobile full width centred
 * (icon 24, Mob/Subtitle 2 16).
 */
export async function ContactInfo({ lang }: { lang: Locale }) {
  const s = await getSiteSettings();
  const t = dict(lang);
  const socials = SOCIALS.filter((k) => s.socials[k]);
  return (
    <div className="flex flex-col gap-8 lg:gap-4">
      <div className="flex flex-col gap-5 lg:gap-3.5">
        <Block icon="phone-24" title={t.contact.info.phone}>
          <Value href={telHref(s.phone)}>{s.phone}</Value>
        </Block>
        <Line />
        <Block icon="envelope-simple" title={t.contact.info.email}>
          <Value href={`mailto:${s.email}`}>{s.email}</Value>
        </Block>
        {socials.length > 0 && (
          <>
            <Line />
            <div className="flex flex-col gap-4 lg:py-4">
              <h2 className="text-subtitle-2-medium text-brand-950">{t.contact.info.social}</h2>
              <div className="flex justify-between gap-1.5 lg:justify-start">
                {socials.map((k) => (
                  <a
                    key={k}
                    href={s.socials[k]}
                    target="_blank"
                    rel="noopener"
                    aria-label={SOCIAL_LABELS[k]}
                    className="relative rounded-full after:absolute after:-inset-0.5 lg:after:inset-0"
                  >
                    <SocialIcon name={k} variant="light" className="size-10 lg:size-11" />
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <a
        href={whatsappHref(s.whatsapp)}
        target="_blank"
        rel="noopener"
        className="flex h-14 items-center justify-center gap-1.5 rounded-full border-2 border-whatsapp-border bg-whatsapp-bg px-[22px] text-mob-subtitle-2 text-whatsapp-text lg:h-[62px] lg:self-start lg:text-subtitle-3-medium"
      >
        <Icon name="whatsapp" size={30} className="size-6 shrink-0 lg:size-[30px]" />
        {t.header.whatsapp}
      </a>
    </div>
  );
}

function Block({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 lg:py-4">
      <h2 className="flex items-center gap-1.5 text-subtitle-2-medium text-brand-950">
        <Icon name={icon} size={24} className="shrink-0" />
        {title}
      </h2>
      {children}
    </div>
  );
}

/** 18px box like Figma (line-height 24 overflows it); the invisible ::after makes the tap target 44px high. */
function Value({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="relative h-[18px] self-start text-body-md text-gray-700 [overflow-wrap:anywhere] after:absolute after:inset-x-0 after:-inset-y-[13px]"
    >
      {children}
    </a>
  );
}

/** Figma LINE (centre stroke): drawn, but takes no room in the auto layout. */
function Line() {
  return <div aria-hidden className="-my-[0.5px] h-px bg-gray-200" />;
}
