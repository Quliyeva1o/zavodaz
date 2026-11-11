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
                  <Link key={l.label} href={l.href} className="text-mob-subtitle-2">
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <nav className="hidden h-[113px] items-center gap-[60px] lg:flex">
            {columns.map((col, i) => (
              <div key={i} className="flex flex-col gap-6">
                {col.map((l) => (
                  <Link key={l.label} href={l.href} className="text-subtitle-3">
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <hr className="border-gray-700" />

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
                <p className="text-subtitle-2s-semibold">{t.footer.address}</p>
                <p className="text-body-md-flat">{s.address[lang]}</p>
              </div>
              <div className="flex flex-col gap-2.5 lg:gap-[18px]">
                <p className="text-subtitle-2s-semibold">{t.footer.phone}</p>
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
            <ul className="flex items-center justify-between gap-4 lg:justify-start lg:gap-[13px]">
              {legal.map((l, i) => (
                <li key={l.label} className="flex items-center gap-4 lg:gap-[13px]">
                  {i > 0 && <span aria-hidden className="h-[9px] w-px bg-white lg:h-3" />}
                  <Link href={l.href} className="text-caption-tight text-gray-100 lg:text-body-sm">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-body-sm text-gray-500">{s.copyright[lang]}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
