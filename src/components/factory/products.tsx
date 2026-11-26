import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { factoryHref, productHref } from "@/i18n/routes";
import { mediaSrc, mediaSrcSet, pdfSrc } from "@/features/media/url";
import type { FactoryPage, Paged, ProductCard as Card, ProductPage } from "@/features/factory/types";
import { formatFileSize } from "@/features/factory/view";
import { Pagination } from "@/components/catalog/pagination";
import { Icon } from "@/components/ui/icon";
import { Empty, Title } from "./factory-tabs";
import { MediaGallery } from "./media-gallery";

/**
 * Figma's card and catalogue texts are fixed one-line boxes (17.05 / 23.05 / 17.05) shorter than their line heights: the
 * boxes keep those heights, one line each (ellipsis), the glyphs overflow them vertically as in Figma (overflow-x-clip,
 * not hidden, so nothing is cut off).
 */
const LINE = "whitespace-nowrap overflow-x-clip text-ellipsis";

/**
 * Product card, Figma 381:10844 (desktop 282×298: photo 281.67×218.42 r6, 10 below it code 12 brand-500, name Subtitle 3 Medium,
 * description body-sm, 6 apart) / 775:23408 (mobile 139×165: photo 139×99.85, 4 below, text 2 apart, name 14, description 12).
 * The name is the link, stretched over the card. A product without a photo shows the placeholder colour.
 */
export function ProductCard({ lang, factorySlug, product: p, priority = false }: { lang: Locale; factorySlug: string; product: Card; priority?: boolean }) {
  const { image } = p;
  return (
    <article className="relative flex min-w-0 flex-col gap-1 lg:gap-2.5">
      <div
        className="relative aspect-[139/99.85] overflow-hidden rounded-md bg-photo-placeholder bg-cover lg:aspect-[281.67/218.42]"
        style={image ? { backgroundImage: `url("${image.blur}")` } : undefined}
      >
        {image && (
          // eslint-disable-next-line @next/next/no-img-element -- own /media route with WebP variants and blur placeholder
          <img
            src={mediaSrc(image, 640)}
            srcSet={mediaSrcSet(image)}
            sizes="(min-width:1440px) 282px, (min-width:1024px) 20vw, 45vw"
            width={image.width}
            height={image.height}
            alt=""
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
        )}
      </div>
      <div className="flex flex-col gap-0.5 lg:gap-1.5">
        <p className={`h-[17.05px] text-caption-tight text-brand-500 ${LINE}`}>{p.id}</p>
        <h3 className="text-body-sm text-brand-950 lg:text-subtitle-3-medium">
          <a href={productHref(factorySlug, p, lang)} title={p.name} className={`block h-[23.05px] leading-[23.05px] after:absolute after:inset-0 ${LINE}`}>
            {p.name}
          </a>
        </h3>
        {p.description && <p className={`h-[17.05px] text-caption-tight text-gray-700 lg:text-body-sm ${LINE}`}>{p.description}</p>}
      </div>
    </article>
  );
}

/** Cards in the Figma grid: 3 columns 24 apart (mobile 2 columns, 10 apart); the first row loads at once. */
function ProductGrid({ lang, factorySlug, items }: { lang: Locale; factorySlug: string; items: Card[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 lg:gap-6">
      {items.map((p, i) => (
        <li key={p.id} className="min-w-0">
          <ProductCard lang={lang} factorySlug={factorySlug} product={p} priority={i < 2} />
        </li>
      ))}
    </ul>
  );
}

/**
 * PDF catalogue card, Figma 381:10824 (439×64, pad 12 incl. the 1px stroke, r6, gray-200 stroke) / 775:23084 (288 wide): FilePdf 33, the
 * title (body-sm) with the size (12, gray-500) 6 under it, and DownloadSimple 24 at the right. The link opens the
 * file itself (`/media/<id>/file.pdf`, Content-Disposition inline) in a new tab.
 */
function CatalogueCard({ lang, file }: { lang: Locale; file: FactoryPage["files"][number] }) {
  const t = dict(lang).factory;
  const size = formatFileSize(file.size, lang);
  return (
    <a
      href={pdfSrc(file.mediaId)}
      target="_blank"
      rel="noopener"
      aria-label={t.catalogueOpen.replace("{title}", file.title).replace("{size}", size)}
      className="flex min-w-0 items-end justify-between gap-[11px] rounded-md border border-gray-200 p-[11px] hover:bg-brand-50"
    >
      <span className="flex min-w-0 items-start gap-2">
        <Icon name="file-pdf" size={33} className="shrink-0" />
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className={`h-[17.05px] text-body-sm text-brand-950 ${LINE}`}>{file.title}</span>
          <span className={`h-[17.05px] text-caption-tight text-gray-500 ${LINE}`}>{size}</span>
        </span>
      </span>
      <Icon name="download-simple" size={24} className="shrink-0" />
    </a>
  );
}

/**
 * Məhsullar, Figma 368:12095 / 775:22833: "Məhsul kataloqu" (PDF cards, 2 columns 16 apart, mobile one column 12 apart),
 * then "Məhsullar" (12 per page) and the pagination 60 below (mobile 32). Sections are 24 apart (mobile 32).
 * The two sections share one box (mobile Figma 775:23017 + 775:23103 above the page-wide pagination row).
 */
export function ProductsTab({ lang, factory: f, list, page }: { lang: Locale; factory: FactoryPage; list: Paged<Card>; page: number }) {
  const t = dict(lang).factory;
  if (f.files.length === 0 && list.items.length === 0) return <Empty>{t.noProducts}</Empty>;
  const base = factoryHref(f.slug, lang, "products");
  return (
    <div className="flex flex-col gap-8 lg:gap-[60px]">
      <div data-figma="factory-products" className="flex flex-col gap-8 lg:gap-6">
        {f.files.length > 0 && (
          <section aria-labelledby="factory-catalogues" className="flex flex-col gap-3 lg:gap-4">
            <Title id="factory-catalogues">{t.catalogue}</Title>
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
              {f.files.map((file) => (
                <li key={file.id} className="min-w-0">
                  <CatalogueCard lang={lang} file={file} />
                </li>
              ))}
            </ul>
          </section>
        )}
        {list.items.length > 0 && (
          <section aria-labelledby="factory-products" className="flex flex-col gap-3 lg:gap-4">
            <Title id="factory-products">{t.products}</Title>
            <ProductGrid lang={lang} factorySlug={f.slug} items={list.items} />
          </section>
        )}
      </div>
      {list.items.length > 0 && (
        <Pagination current={page} count={list.pageCount} hrefFor={(n) => (n === 1 ? base : `${base}?page=${n}`)} label={t.productsPager} lang={lang} />
      )}
    </div>
  );
}

/**
 * Product page, Figma 382:11083 / 775:23288: (desktop) a back button + "Məhsullar" (H4), then two columns 40 apart:
 * the gallery (main 427×381 + 6 thumbnails; links to the full-size files, the lazy lightbox opens them) and the text —
 * code (Subtitle 3, brand-500), name (H3), description (body-md, gray-700), 24 apart. "Oxşar məhsullar" 60 below
 * (mobile 32): up to 6 cards of the same grid. The factory header, tabs and contact card around it are the shell's.
 */
export function ProductView({ lang, factory: f, product: p, similar }: { lang: Locale; factory: FactoryPage; product: ProductPage; similar: Card[] }) {
  const t = dict(lang).factory;
  return (
    <div className="flex flex-col gap-8 lg:gap-[60px]">
      <article className="flex flex-col gap-4 lg:gap-8">
        <div className="hidden items-center gap-2.5 lg:flex">
          <a
            href={factoryHref(f.slug, lang, "products")}
            aria-label={t.productsBack}
            className="flex size-10 items-center justify-center rounded-full bg-gray-50 hover:bg-brand-50"
          >
            <Icon name="caret-left" size={20} />
          </a>
          <p aria-hidden className="text-h4 text-brand-950">
            {t.products}
          </p>
        </div>
        <div className={`flex flex-col gap-4 ${p.images.length > 0 ? "lg:grid lg:grid-cols-2 lg:gap-10" : ""}`}>
          <MediaGallery images={p.images} name={p.name} photoLabel={t.productPhoto} labels={t.lightbox} variant="product" priority />
          <div className="flex min-w-0 flex-col gap-2.5 lg:gap-6">
            <p className="h-[17.05px] text-body-sm text-brand-500 lg:text-subtitle-3">{p.id}</p>
            <h1 className="text-mob-subtitle leading-[23px] text-brand-950 [overflow-wrap:anywhere] lg:text-h3 lg:leading-[38px]">{p.name}</h1>
            {p.description.trim() && <p className="whitespace-pre-line text-body-md text-gray-700 [overflow-wrap:anywhere]">{p.description}</p>}
          </div>
        </div>
      </article>
      {similar.length > 0 && (
        <section aria-labelledby="factory-similar" className="flex flex-col gap-3 lg:gap-4">
          <Title id="factory-similar">{t.similar}</Title>
          <ProductGrid lang={lang} factorySlug={f.slug} items={similar} />
        </section>
      )}
    </div>
  );
}
