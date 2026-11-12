import { Fragment } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { href } from "@/i18n/routes";
import { getSiteSettings } from "@/features/settings/queries";
import { SOCIALS } from "@/features/settings/schema";
import { telHref } from "@/features/settings/links";
import { SocialIcon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";

const SOCIAL_LABELS = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", x: "X", youtube: "YouTube", tiktok: "TikTok" };

export async function Footer({ lang }: { lang: Locale }) {
  const s = await getSiteSettings();
  const t = dict(lang);
  // Figma column order. "Xidmətlər" → Tariflər until question S1 is answered.
  const columns = [
    [
      { href: href("home", lang), label: t.nav.home },
      { href: href("news", lang), label: t.nav.news },
    ],
    [
      { href: href("catalog", lang), label: t.nav.catalog },
      { href: href("tariffs", lang), label: t.nav.services },
    ],
    [
      { href: href("vacancies", lang), label: t.nav.vacancies },
      { href: href("contact", lang), label: t.nav.contact },
    ],
  ];
  // Figma mobile footer: left — Ana səhifə, Xəbərlər, Kataloq; right — Xidmətlər, Vakansiyalar, Əlaqə.
  const mobileColumns = [
    [columns[0][0], columns[0][1], columns[1][0]],
    [columns[1][1], columns[2][0], columns[2][1]],
  ];
  const legal = [
    { href: href("terms", lang), label: t.footer.terms },
    { href: href("help", lang), label: t.footer.help },
    { href: href("privacy", lang), label: t.footer.privacy },
  ];
  const socials = SOCIALS.filter((k) => s.socials[k]);

  return (
    <footer data-figma="footer" className="bg-brand-950 pt-8 pb-6 text-white lg:pt-10">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 lg:gap-[37px]">
        {/* Logo + links */}
        <div className="flex flex-col gap-8 px-4 lg:flex-row lg:items-start lg:justify-between lg:px-[60px]">
          <Link href={href("home", lang)} aria-label="Zavod.az">
            <span className="lg:hidden"><Logo variant="footer-mobile" /></span>
            <span className="hidden lg:block"><Logo variant="footer" /></span>
          </Link>
          {/* Mobile: 2 columns x 3 links; desktop: 3 columns x 2 links, vertically centred on the logo */}
          <nav className="grid grid-cols-2 gap-x-0 gap-y-4 lg:hidden">
            {mobileColumns.map((col, i) => (
              <div key={i} className="flex flex-col gap-4">
                {col.map((l) => (
                  <Link key={l.label} href={l.href} className="h-5 text-mob-subtitle-2">
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <nav className="hidden items-center gap-[60px] lg:flex lg:self-stretch">
            {columns.map((col, i) => (
              <div key={i} className="flex flex-col gap-6">
                {col.map((l) => (
                  <Link key={l.label} href={l.href} className="h-6 text-subtitle-3">
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>

        {/* Figma line is 0 high and draws its 1px stroke above its position */}
        <hr className="-mt-px border-gray-700" />

        <div className="flex flex-col gap-6 px-4 lg:gap-[25px] lg:px-[60px]">
          <div className="flex flex-col gap-8 lg:h-[74px] lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2.5">
              <p className="text-body-md">{t.footer.follow}</p>
              <div className="flex items-center justify-between lg:justify-start lg:gap-2.5">
                {socials.map((k) => (
                  <a key={k} href={s.socials[k]} target="_blank" rel="noopener" aria-label={SOCIAL_LABELS[k]}>
                    <SocialIcon name={k} />
                  </a>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-[60px]">
              <div className="flex flex-col gap-2.5 lg:w-[254px] lg:gap-[18px]">
                <p className="h-[21px] text-subtitle-2s-semibold">{t.footer.address}</p>
                <p className="text-body-md-flat">{s.address[lang]}</p>
              </div>
              <div className="flex flex-col gap-2.5 lg:gap-[18px]">
                <p className="h-[21px] text-subtitle-2s-semibold">{t.footer.phone}</p>
                <p className="flex items-center gap-2.5 text-body-md-flat">
                  <a href={telHref(s.phone)}>{s.phone}</a>
                  {s.phone2 && (
                    <>
                      <span aria-hidden>/</span>
                      <a href={telHref(s.phone2)}>{s.phone2}</a>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Figma: links and 0-wide separator lines are siblings — mobile space-between, desktop gap 13 */}
            <ul className="flex min-h-[17px] flex-wrap items-center justify-between gap-x-2 gap-y-1 text-caption-tight text-gray-100 lg:justify-start lg:gap-[13px] lg:text-body-sm">
              {legal.map((l, i) => (
                <Fragment key={l.label}>
                  {i > 0 && <li aria-hidden className="-mr-px h-[9px] w-px bg-white lg:h-[11.659px]" />}
                  <li>
                    <Link href={l.href} className="whitespace-nowrap">
                      {l.label}
                    </Link>
                  </li>
                </Fragment>
              ))}
            </ul>
            <p className="text-body-sm text-gray-500">{s.copyright[lang]}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
