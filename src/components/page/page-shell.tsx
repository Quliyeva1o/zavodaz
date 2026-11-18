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
  /** Crumbs between "Ana səhifə" and the current page (catalog type pages: Kataloq). */
  crumbs?: { label: string; href: string }[];
  /** Last breadcrumb item when it differs from the title (landings: "Bakı" under the title "Fabriklər — Bakı"). */
  crumbLabel?: string;
  figma: string;
  /** false: the page lays out its own h1 (e.g. Əlaqə, where the title sits inside a column); content starts 32 under the breadcrumb. */
  heading?: boolean;
  /** Right column on desktop (880 + 60 + 380), below the content on mobile (60 under it): the legal pages card. */
  aside?: ReactNode;
  children: ReactNode;
};

/**
 * Breadcrumb + page title (H2 style, h1 element) + content, as the Figma content frames
 * (143:4005 desktop: breadcrumb→title 32, title→content 32; mobile 685:20709: breadcrumb→content 32, title→text 24,
 * content→legal card 60). The <main> box is the Figma frame itself: the space above it (header→breadcrumb: 30
 * desktop, 20 mobile — page frame 143:1692 gap 30) and below it (content→next block: page frame 143:1691 gap 120,
 * mobile 685:20709 gap 60) are margins. On mobile Figma splits the page into sibling 320px frames (breadcrumb
 * 685:21532, content 685:20860, card 685:21541): `<figma>-crumbs`, `<figma>-body` and `<figma>-nav` mark them
 * (`-mx-4 px-4` = the 320 frame with its 16px padding; `lg:contents` drops the wrapper box on desktop).
 */
export function PageShell({ lang, title, intro, currentPath, crumbs: middle = [], crumbLabel, figma, heading = true, aside, children }: Props) {
  const t = dict(lang);
  const crumbs = [{ label: t.nav.home, href: href("home", lang) }, ...middle, { label: crumbLabel ?? title }];
  // Mobile title box 30 high as in Figma (685:20861: 24/29.76 in a 30 text box — Figma rounds auto-height boxes).
  const h1 = <h1 className="min-h-[30px] text-mob-h2 text-brand-950 lg:min-h-0 lg:text-h2">{title}</h1>;
  const head = !heading ? null : intro ? (
    <div className="flex flex-col gap-4 lg:col-span-2 lg:w-full lg:max-w-[617px]">
      {h1}
      {/* not in the mobile Figma frame (696:19453) */}
      <p className="hidden text-body-md text-gray-700 lg:block">{intro}</p>
    </div>
  ) : (
    <div className="lg:col-span-2">{h1}</div>
  );
  const body = (
    <div data-figma={`${figma}-body`} className="-mx-4 flex flex-col gap-6 px-4 lg:contents">
      {head}
      {children}
    </div>
  );
  return (
    <main data-figma={figma} className="container-site mt-5 mb-[60px] flex flex-col gap-8 lg:mt-[30px] lg:mb-[120px]">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t.nav.home, url: href("home", lang) },
          ...middle.map((c) => ({ name: c.label, url: c.href })),
          { name: crumbLabel ?? title, url: currentPath },
        ])}
      />
      <div data-figma={`${figma}-crumbs`} className="-mx-4 px-4 lg:mx-0 lg:px-0">
        <Breadcrumb items={crumbs} label={t.breadcrumb} />
      </div>
      {aside ? (
        <div className="flex flex-col gap-[60px] lg:grid lg:grid-cols-[minmax(0,880fr)_minmax(0,380fr)] lg:gap-x-[60px] lg:gap-y-8">
          {body}
          <div data-figma={`${figma}-nav`} className="lg:col-start-2 lg:row-start-2">
            {aside}
          </div>
        </div>
      ) : (
        body
      )}
    </main>
  );
}
