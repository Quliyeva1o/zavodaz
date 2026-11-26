import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import type { FactoryPage } from "@/features/factory/types";
import { websiteLabel } from "@/features/factory/view";
import { SOCIAL_LABELS, SOCIALS, telHref } from "@/features/settings/links";
import { Icon, type IconName, SocialIcon } from "@/components/ui/icon";

/**
 * "Əlaqə məlumatları", Figma 331:10233 (desktop 397 wide, pad 24, r10) / 767:23254 (mobile pad 14, r6); the pads include the 1px stroke (Figma draws it inside): title
 * (Subtitle 1 Medium / Mob Subtitle 2), rows 24 apart — icon 24 + 12 + body-md gray-700 (the address wraps), a line,
 * then the factory's social links as 44 circles (desktop one row 17 apart; mobile wrapping 12 / 10 apart).
 * Only the filled rows show; the website is user content: `rel="nofollow noopener"`, new tab.
 */
export function ContactCard({ lang, factory: f, className = "" }: { lang: Locale; factory: FactoryPage; className?: string }) {
  const t = dict(lang).factory;
  const socials = SOCIALS.filter((k) => f.socials[k]);
  const rows: { icon: IconName; label: string; content: ReactNode }[] = [];
  if (f.phone) rows.push({ icon: "phone-24", label: t.contact.phone, content: <a href={telHref(f.phone)}>{f.phone}</a> });
  if (f.email) rows.push({ icon: "envelope-simple", label: t.contact.email, content: <a href={`mailto:${f.email}`}>{f.email}</a> });
  if (f.website)
    rows.push({
      icon: "globe-simple",
      label: t.contact.website,
      content: (
        <a href={f.website} target="_blank" rel="nofollow noopener">
          {websiteLabel(f.website)}
        </a>
      ),
    });
  if (f.address) rows.push({ icon: "map-pin", label: t.contact.address, content: f.address });
  if (rows.length === 0 && socials.length === 0) return null;
  return (
    <section
      aria-labelledby="factory-contacts"
      data-figma="factory-contacts"
      className={`flex flex-col gap-6 rounded-md border border-gray-200 bg-white p-[13px] lg:rounded-[10px] lg:p-[23px] ${className}`}
    >
      <h2 id="factory-contacts" className="text-mob-subtitle-2 leading-5 text-brand-950 lg:text-subtitle-1-medium lg:leading-7">
        {t.contacts}
      </h2>
      <div className="flex flex-col gap-6">
        {rows.length > 0 && (
          <ul className="flex flex-col gap-6">
            {rows.map((r) => (
              <li key={r.icon} className="flex items-start gap-3 text-body-md text-gray-700">
                <Icon name={r.icon} size={24} className="shrink-0" />
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  <span className="sr-only">{r.label}: </span>
                  {r.content}
                </span>
              </li>
            ))}
          </ul>
        )}
        {rows.length > 0 && socials.length > 0 && <div aria-hidden className="-my-[0.5px] h-px bg-gray-200" />}
        {socials.length > 0 && (
          <ul className="flex flex-wrap gap-x-3 gap-y-2.5 lg:flex-nowrap lg:gap-[17px]">
            {socials.map((k) => (
              <li key={k}>
                <a href={f.socials[k]} target="_blank" rel="nofollow noopener" aria-label={SOCIAL_LABELS[k]} className="block rounded-full">
                  <SocialIcon name={k} variant="light" size={44} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
