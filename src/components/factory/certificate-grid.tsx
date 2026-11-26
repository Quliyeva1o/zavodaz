import { mediaSrc, mediaSrcSet } from "@/features/media/url";
import type { FactoryPage } from "@/features/factory/types";
import { GalleryLightbox, type LightboxLabels } from "./gallery-lightbox";
import { lightboxImages } from "./media-gallery";

/**
 * Figma 361:11001 (desktop: 4 columns 16 apart, 200×200 gray-50 boxes, r10, pad 20, the certificate fitted inside) /
 * 773:24754 (mobile: one row of 124×124 boxes 10 apart, r6, pad 12, scrolled sideways; Figma's dot indicator is left
 * out — the row scrolls by touch and needs no JavaScript). Each certificate opens in the lightbox.
 */
export function CertificateGrid({ certificates, labels }: { certificates: FactoryPage["certificates"]; labels: LightboxLabels }) {
  const full = lightboxImages(certificates.map((c) => ({ image: c.image, alt: c.title })));
  return (
    <GalleryLightbox images={full} labels={labels}>
      <ul className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 lg:mx-0 lg:grid lg:grid-cols-[repeat(4,minmax(0,200px))] lg:gap-4 lg:overflow-visible lg:px-0">
        {certificates.map((c, i) => (
          <li key={c.id} className="shrink-0 snap-start">
            <a
              href={full[i].src}
              data-index={i}
              aria-label={c.title}
              title={c.title}
              className="flex size-[124px] items-center justify-center rounded-md bg-gray-50 p-3 lg:aspect-square lg:size-auto lg:rounded-[10px] lg:p-5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- own /media route */}
              <img
                src={mediaSrc(c.image, 320)}
                srcSet={mediaSrcSet(c.image)}
                sizes="(min-width:1024px) 160px, 100px"
                width={c.image.width}
                height={c.image.height}
                alt=""
                loading="lazy"
                decoding="async"
                className="max-h-full w-auto max-w-full object-contain"
              />
            </a>
          </li>
        ))}
      </ul>
    </GalleryLightbox>
  );
}
