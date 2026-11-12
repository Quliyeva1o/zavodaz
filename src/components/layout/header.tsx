import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { href, type RouteKey } from "@/i18n/routes";
import { getSiteSettings } from "@/features/settings/queries";
import { telHref } from "@/features/settings/links";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { WhatsAppLink } from "@/components/ui/whatsapp-link";
import { LangSwitcher } from "./lang-switcher";
import { MobileMenu } from "./mobile-menu";

export const NAV = ["home", "news", "catalog", "tariffs", "vacancies", "contact"] as const satisfies RouteKey[];

/**
 * Menu text boxes as drawn in Figma (desktop 143:1693 "Frame 7", mobile menu 682:20679): the items
 * are 22.363 high, except "Tariflər" and "Əlaqə", which hug their text; four AZ boxes have hand-set
 * widths and the two hugging ones are rounded to whole pixels — so the gaps between the words are
 * not uniform. Kept 1:1 for the Azerbaijani labels (spec 1.1); other languages hug their text at the
 * common 22.363 height.
 */
const NAV_ITEM_HEIGHT = 22.363;
const AZ_NAV_BOX: Record<(typeof NAV)[number], { width: number; height?: number }> = {
  home: { width: 87.644, height: NAV_ITEM_HEIGHT },
  news: { width: 73.424, height: NAV_ITEM_HEIGHT },
  catalog: { width: 65.39, height: NAV_ITEM_HEIGHT },
  tariffs: { width: 59 },
  vacancies: { width: 107.599, height: NAV_ITEM_HEIGHT },
  contact: { width: 49 },
};

export async function Header({ lang }: { lang: Locale }) {
  const s = await getSiteSettings();
  const t = dict(lang);
  const links = NAV.map((k) => ({
    href: href(k, lang),
    label: t.nav[k],
    box: lang === "az" ? AZ_NAV_BOX[k] : { height: NAV_ITEM_HEIGHT },
  }));

  return (
    <header data-figma="header" className="bg-white lg:border-b lg:border-gray-200">
      {/* Desktop >= 1024: 128px + 1px bottom border = Figma 129 */}
      <div className="mx-auto hidden h-[128px] max-w-[1440px] items-end justify-between px-[60px] pt-5 pb-[19px] lg:flex">
        <Link href={href("home", lang)} aria-label="Zavod.az">
          <Logo variant="header" priority />
        </Link>
        <div className="flex flex-col items-end gap-[25px]">
          <div className="flex h-10 items-center gap-5">
            <a href={telHref(s.phone)} className="flex items-center gap-1.5 text-body-md text-brand-950">
              <Icon name="phone" size={20} />
              {s.phone}
            </a>
            <WhatsAppLink number={s.whatsapp} label={t.header.whatsapp} className="w-[240px] px-[9px]" />
            <LangSwitcher lang={lang} labels={t.languages} languageLabel={t.header.language} />
            <Link
              href={href("login", lang)}
              className="flex h-10 items-center gap-1.5 rounded-[4px] bg-brand-950 px-4 text-body-md text-white"
            >
              <Icon name="user-white" size={20} />
              {t.header.login}
            </Link>
          </div>
          <nav aria-label={t.header.mainMenu} className="flex h-6 items-center gap-10">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={l.box}
                // ::before widens the tap area to ≥ 44px without moving anything
                className="relative before:absolute before:inset-x-0 before:-inset-y-[11px] shrink-0 whitespace-nowrap text-subtitle-3-medium text-brand-950"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile < 1024: Figma 320x62 */}
      <div className="flex h-[62px] items-end justify-between px-4 pt-4 lg:hidden">
        <Link href={href("home", lang)} aria-label="Zavod.az">
          <Logo variant="header-mobile" priority />
        </Link>
        <div className="flex items-center gap-2.5">
          <Link
            href={href("login", lang)}
            aria-label={t.header.login}
            className="flex size-10 items-center justify-center rounded-[4px] bg-brand-950"
          >
            <Icon name="user-white" size={20} />
          </Link>
          <MobileMenu
            lang={lang}
            links={links}
            languageLabels={t.languages}
            labels={{ open: t.header.openMenu, close: t.header.closeMenu, whatsapp: t.header.whatsapp, language: t.header.language }}
            phone={s.phone}
            whatsapp={s.whatsapp}
          />
        </div>
      </div>
    </header>
  );
}
