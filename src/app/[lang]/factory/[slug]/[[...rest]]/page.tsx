import type { Metadata } from "next";
import { cache, type ReactNode } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { defaultLocale, type Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { factoryHref, productHref, productKey, type FactoryTab } from "@/i18n/routes";
import { getDictionaries } from "@/features/catalog/queries";
import {
  getFactoryBySlug,
  getFactoryPreview,
  getFactoryProducts,
  getFactoryVacancies,
  getProduct,
  getSimilarProducts,
  resolveRedirect,
} from "@/features/factory/queries";
import type { FactoryPage, Paged, VacancyCard } from "@/features/factory/types";
import { factoryDescription, factoryTitle, organizationJsonLd, parsePageParam, productJsonLd, productTitle } from "@/features/factory/view";
import { mediaSrc } from "@/features/media/url";
import { SITE_NAME } from "@/features/pages/seo-title";
import { getSessionUser } from "@/lib/auth";
import { localizedPaths } from "@/lib/catalog-seo";
import { siteUrl } from "@/lib/seo";
import { JsonLd } from "@/lib/structured-data";
import { FactoryShell } from "@/components/factory/factory-shell";
import { AboutTab, CapabilitiesTab, MediaTab, VacanciesTab } from "@/components/factory/factory-tabs";
import { ProductsTab, ProductView } from "@/components/factory/products";

// Blocking render (R12): `?page` (vacancies) and `?preview=1` are request-time data, and the page must work
// without JavaScript (content streamed into a Suspense boundary needs JS to show). Data comes from `use cache` queries.
export const instant = false;

type Props = PageProps<"/[lang]/factory/[slug]/[[...rest]]">;
type SearchParams = Record<string, string | string[] | undefined>;

const SUB_TABS = new Set<FactoryTab>(["media", "products", "capabilities", "vacancies"]);

/** Internal rest (proxy rewrite, routes.ts) → the tab, plus the product code on a product page (`products/<code>-<slug>`). */
function routeOf(rest: string[] | undefined): { tab: FactoryTab; code?: number } | null {
  if (!rest || rest.length === 0) return { tab: "about" };
  if (rest.length === 1) return SUB_TABS.has(rest[0] as FactoryTab) ? { tab: rest[0] as FactoryTab } : null;
  const code = rest.length === 2 && rest[0] === "products" ? productKey(rest[1]) : null;
  return code === null ? null : { tab: "products", code };
}

/**
 * Admin "Önizlə" (`?preview=1` + admin session): any status, never cached. Everyone else: published only (cached).
 * React cache: metadata and page share one session check and one preview query per request.
 */
const loadFactoryFor = cache(async (slug: string, wantsPreview: boolean): Promise<{ factory: FactoryPage | null; preview: boolean }> => {
  if (wantsPreview) {
    const user = await getSessionUser();
    if (user?.role === "admin") return { factory: await getFactoryPreview(slug), preview: true };
  }
  return { factory: await getFactoryBySlug(slug), preview: false };
});
const loadFactory = (slug: string, sp: SearchParams) => loadFactoryFor(slug, sp.preview === "1");

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang: l, slug, rest } = await params;
  const lang = l as Locale;
  const route = routeOf(rest);
  if (!route) return {};
  const { tab } = route;
  const sp = await searchParams;
  const { factory, preview } = await loadFactory(slug, sp);
  if (!factory) return {};
  const t = dict(lang);
  if (route.code !== undefined) {
    const product = await getProduct(factory.id, route.code);
    if (!product) return {};
    const urls = localizedPaths((x) => productHref(factory.slug, product, x));
    const description = factoryDescription(product.description);
    const title = productTitle(product.name, factory.name);
    return {
      title,
      description: description || undefined,
      alternates: { canonical: urls[lang], languages: preview ? undefined : { ...urls, "x-default": urls[defaultLocale] } },
      robots: preview ? { index: false, follow: true } : undefined,
      openGraph: {
        type: "website",
        siteName: SITE_NAME,
        title,
        description: description || undefined,
        url: urls[lang],
        images: product.images[0] ? [mediaSrc(product.images[0], 960)] : undefined,
      },
    };
  }
  const title = factoryTitle(factory.name, t.factoryType[factory.type], tab === "about" ? undefined : t.factory.tabs[tab]);
  const description = factoryDescription(factory.about);
  // Every tab is its own canonical URL. "Daha çox göstər" pages (vacancies ?page=N) repeat the first ones: noindex.
  // Product list pages (?page=N) are distinct content: indexed, each its own canonical.
  const page = tab === "vacancies" || tab === "products" ? parsePageParam(sp.page) : 1;
  const query = page > 1 ? `?page=${page}` : "";
  const urls = localizedPaths((x) => factoryHref(factory.slug, x, tab) + query);
  const noindex = preview || (tab === "vacancies" && page > 1);
  return {
    title,
    description: description || undefined,
    alternates: { canonical: urls[lang], languages: noindex ? undefined : { ...urls, "x-default": urls[defaultLocale] } },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
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
  const route = routeOf(rest);
  if (!route) notFound();
  const { tab } = route;
  const sp = await searchParams;
  const { factory, preview } = await loadFactory(slug, sp);
  if (!factory) {
    const to = await resolveRedirect(factoryHref(slug, lang, tab));
    if (to) permanentRedirect(to);
    notFound();
  }
  if (route.code !== undefined) {
    // A product with a wrong slug part never gets here: the proxy answers it with a 301 (and if the proxy could not
    // check, the page renders and its canonical link names the right URL). Hidden/draft/foreign products: soft 404.
    const [product, similar] = await Promise.all([getProduct(factory.id, route.code), getSimilarProducts(factory.id, route.code)]);
    if (!product) notFound();
    const url = siteUrl + productHref(factory.slug, product, lang);
    return (
      <>
        <JsonLd data={productJsonLd(product, factory, { url, origin: siteUrl })} />
        <FactoryShell lang={lang} factory={factory} tab={tab} preview={preview} leaf={{ label: product.name, href: productHref(factory.slug, product, lang) }}>
          <ProductView lang={lang} factory={factory} product={product} similar={similar} />
        </FactoryShell>
      </>
    );
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
    case "products": {
      const page = parsePageParam(sp.page);
      const list = await getFactoryProducts(factory.id, page);
      if (page > Math.max(list.pageCount, 1)) notFound();
      body = <ProductsTab lang={lang} factory={factory} list={list} page={page} />;
      break;
    }
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
