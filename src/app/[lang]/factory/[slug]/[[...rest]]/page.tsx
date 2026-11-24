import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { defaultLocale, type Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { factoryHref, type FactoryTab } from "@/i18n/routes";
import { getDictionaries } from "@/features/catalog/queries";
import { getFactoryBySlug, getFactoryPreview, getFactoryVacancies, resolveRedirect } from "@/features/factory/queries";
import type { FactoryPage, Paged, VacancyCard } from "@/features/factory/types";
import { factoryDescription, factoryTitle, organizationJsonLd, parsePageParam } from "@/features/factory/view";
import { mediaSrc } from "@/features/media/url";
import { getSessionUser } from "@/lib/auth";
import { localizedPaths } from "@/lib/catalog-seo";
import { siteUrl } from "@/lib/seo";
import { JsonLd } from "@/lib/structured-data";
import { FactoryShell } from "@/components/factory/factory-shell";
import { AboutTab, CapabilitiesTab, MediaTab, VacanciesTab } from "@/components/factory/factory-tabs";

// Blocking render (R12): `?page` (vacancies) and `?preview=1` are request-time data, and the page must work
// without JavaScript (content streamed into a Suspense boundary needs JS to show). Data comes from `use cache` queries.
export const instant = false;

type Props = PageProps<"/[lang]/factory/[slug]/[[...rest]]">;
type SearchParams = Record<string, string | string[] | undefined>;

const SUB_TABS = new Set<FactoryTab>(["media", "products", "capabilities", "vacancies"]);

/** Internal rest (proxy rewrite, routes.ts) → tab. The product page (`products/<code>`) arrives with Task 4. */
function tabOf(rest: string[] | undefined): FactoryTab | null {
  if (!rest || rest.length === 0) return "about";
  return rest.length === 1 && SUB_TABS.has(rest[0] as FactoryTab) ? (rest[0] as FactoryTab) : null;
}

/** Admin "Önizlə" (`?preview=1` + admin session): any status, never cached. Everyone else: published only (cached). */
async function loadFactory(slug: string, sp: SearchParams): Promise<{ factory: FactoryPage | null; preview: boolean }> {
  if (sp.preview === "1") {
    const user = await getSessionUser();
    if (user?.role === "admin") return { factory: await getFactoryPreview(slug), preview: true };
  }
  return { factory: await getFactoryBySlug(slug), preview: false };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang: l, slug, rest } = await params;
  const lang = l as Locale;
  const tab = tabOf(rest);
  if (!tab) return {};
  const sp = await searchParams;
  const { factory, preview } = await loadFactory(slug, sp);
  if (!factory) return {};
  const t = dict(lang);
  const title = factoryTitle(factory.name, t.factoryType[factory.type], tab === "about" ? undefined : t.factory.tabs[tab]);
  const description = factoryDescription(factory.about);
  // Every tab is its own canonical URL; "Daha çox göstər" pages (vacancies ?page=N) repeat the first ones: noindex.
  const page = tab === "vacancies" ? parsePageParam(sp.page) : 1;
  const query = page > 1 ? `?page=${page}` : "";
  const urls = localizedPaths((x) => factoryHref(factory.slug, x, tab) + query);
  const noindex = preview || page > 1;
  return {
    title,
    description: description || undefined,
    alternates: { canonical: urls[lang], languages: noindex ? undefined : { ...urls, "x-default": urls[defaultLocale] } },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      siteName: "Zavod.az",
      title,
      description: description || undefined,
      url: urls[lang],
      images: factory.cover ? [mediaSrc(factory.cover, 960)] : undefined,
    },
  };
}

/** "Daha çox göstər": page N lists the first N×8 vacancies (each page is its own cached query). */
async function vacanciesUpTo(factoryId: string, page: number): Promise<Paged<VacancyCard> | null> {
  const first = await getFactoryVacancies(factoryId, 1);
  if (page > Math.max(first.pageCount, 1)) return null;
  const rest = await Promise.all(Array.from({ length: page - 1 }, (_, i) => getFactoryVacancies(factoryId, i + 2)));
  return { ...first, items: [first, ...rest].flatMap((p) => p.items) };
}

/**
 * Factory page (spec §5; Figma 312:11599 and its tabs): /fabrik/<slug>[/media|/mehsullar|/texniki-imkanlar|/vakansiyalar].
 * Draft and hidden factories, an unknown slug and a page past the last one are not found — with Cache Components
 * that is a soft 404 (status 200, not-found content, noindex; R11). A renamed slug never gets here: the proxy
 * answers it with a real 301 (R2); the lookup below is the fallback for when the proxy's map could not load.
 */
export default async function FactoryRoute({ params, searchParams }: Props) {
  const { lang: l, slug, rest } = await params;
  const lang = l as Locale;
  const tab = tabOf(rest);
  if (!tab) notFound();
  const sp = await searchParams;
  const { factory, preview } = await loadFactory(slug, sp);
  if (!factory) {
    const to = await resolveRedirect(factoryHref(slug, lang, tab));
    if (to) permanentRedirect(to);
    notFound();
  }

  let body: ReactNode = null;
  switch (tab) {
    case "about":
      body = <AboutTab lang={lang} factory={factory} dicts={await getDictionaries()} />;
      break;
    case "media":
      body = <MediaTab lang={lang} factory={factory} />;
      break;
    case "capabilities":
      body = <CapabilitiesTab lang={lang} factory={factory} />;
      break;
    case "vacancies": {
      const page = parsePageParam(sp.page);
      const list = await vacanciesUpTo(factory.id, page);
      if (!list) notFound();
      body = <VacanciesTab lang={lang} factory={factory} list={list} page={page} />;
      break;
    }
    case "products":
      // Task 4: PDF catalogues + product grid.
      break;
  }

  return (
    <>
      <JsonLd
        data={organizationJsonLd(factory, { url: siteUrl + factoryHref(factory.slug, lang), origin: siteUrl, description: factoryDescription(factory.about) })}
      />
      <FactoryShell lang={lang} factory={factory} tab={tab} preview={preview}>
        {body}
      </FactoryShell>
    </>
  );
}
