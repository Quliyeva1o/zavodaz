import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { factoryHref, href, typeHref, type FactoryTab } from "@/i18n/routes";
import type { FactoryPage } from "@/features/factory/types";
import { breadcrumbJsonLd, JsonLd } from "@/lib/structured-data";
import { Breadcrumb } from "@/components/page/breadcrumb";
import { ContactCard } from "./contact-card";
import { FactoryHeader } from "./factory-header";
import { TabNav } from "./tab-nav";

/**
 * Factory page frame, Figma 312:11599 (desktop) / 762:22809 (mobile): breadcrumb (Ana səhifə › type › name), then
 * desktop two columns 893 + 30 + 397 — header, tabs (32 below) and the tab content (24 below) on the left, the
 * contact card on the right; mobile one column with 32 between header, contact card, tabs and content (Figma order).
 * The breadcrumb sits 30 under the site header (mobile 20) and 30 above the columns (mobile 32), as on PageShell.
 * The right-column banner and the full-width banner under the page arrive with step 5 (controller decision).
 */
export function FactoryShell({
  lang,
  factory,
  tab,
  preview = false,
  children,
}: {
  lang: Locale;
  factory: FactoryPage;
  tab: FactoryTab;
  /** Admin "Önizlə": tab links keep `?preview=1`. */
  preview?: boolean;
  children: ReactNode;
}) {
  const t = dict(lang);
  const typeLabel = t.factoryType[factory.type];
  const crumbs = [
    { label: t.nav.home, href: href("home", lang) },
    { label: typeLabel, href: typeHref(factory.type, lang) },
  ];
  return (
    <main data-figma="factory" className="container-site mt-5 mb-[60px] flex flex-col gap-8 lg:mt-[30px] lg:mb-[120px] lg:gap-[30px]">
      <JsonLd
        data={breadcrumbJsonLd([...crumbs.map((c) => ({ name: c.label, url: c.href })), { name: factory.name, url: factoryHref(factory.slug, lang) }])}
      />
      <div data-figma="factory-crumbs">
        <Breadcrumb items={[...crumbs, { label: factory.name }]} label={t.breadcrumb} />
      </div>
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,893fr)_minmax(0,397fr)] lg:items-start lg:gap-x-[30px] lg:gap-y-0">
        <FactoryHeader lang={lang} factory={factory} className="lg:col-start-1 lg:row-start-1" />
        <ContactCard lang={lang} factory={factory} className="lg:col-start-2 lg:row-span-3 lg:row-start-1" />
        <TabNav lang={lang} slug={factory.slug} current={tab} preview={preview} className="lg:col-start-1 lg:row-start-2 lg:mt-8" />
        <div data-figma="factory-content" className="min-w-0 lg:col-start-1 lg:row-start-3 lg:mt-6">
          {children}
        </div>
      </div>
    </main>
  );
}
