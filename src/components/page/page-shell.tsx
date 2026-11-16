import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { href } from "@/i18n/routes";
import { JsonLd, breadcrumbJsonLd } from "@/lib/structured-data";
import { Breadcrumb } from "./breadcrumb";

type Props = {
  lang: Locale;
  title: string;
  intro?: string;
  currentPath: string;
  figma: string;
  /** false: the page lays out its own h1 (e.g. Əlaqə, where the title sits inside a column); content starts 32 under the breadcrumb. */
  heading?: boolean;
  children: ReactNode;
};

/**
 * Breadcrumb + page title (H2 style, h1 element) + content, as the Figma content frames
 * (143:4005 desktop: header→breadcrumb 30, breadcrumb→title 32, title→content 32;
 * mobile 685:20709: 20 / 32 / 24).
 */
export function PageShell({ lang, title, intro, currentPath, figma, heading = true, children }: Props) {
  const t = dict(lang);
  const crumbs = [{ label: t.nav.home, href: href("home", lang) }, { label: title }];
  if (!heading) {
    return (
      <main data-figma={figma} className="container-site flex flex-col gap-8 pt-5 lg:pt-[30px]">
        <JsonLd data={breadcrumbJsonLd([{ name: t.nav.home, url: href("home", lang) }, { name: title, url: currentPath }])} />
        <Breadcrumb items={crumbs} label={t.breadcrumb} />
        {children}
      </main>
    );
  }
  return (
    <main data-figma={figma} className="container-site flex flex-col gap-6 pt-5 lg:gap-8 lg:pt-[30px]">
      <JsonLd data={breadcrumbJsonLd([{ name: t.nav.home, url: href("home", lang) }, { name: title, url: currentPath }])} />
      <div className="flex flex-col gap-8">
        <Breadcrumb items={crumbs} label={t.breadcrumb} />
        {intro ? (
          <div className="flex flex-col gap-4 lg:w-full lg:max-w-[617px]">
            <h1 className="text-mob-h2 text-brand-950 lg:text-h2">{title}</h1>
            {/* not in the mobile Figma frame (696:19453) */}
            <p className="hidden text-body-md text-gray-700 lg:block">{intro}</p>
          </div>
        ) : (
          <h1 className="text-mob-h2 text-brand-950 lg:text-h2">{title}</h1>
        )}
      </div>
      {children}
    </main>
  );
}
