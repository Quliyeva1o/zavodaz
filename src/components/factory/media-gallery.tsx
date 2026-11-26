import { mediaSrc, mediaSrcSet } from "@/features/media/url";
import type { MediaImage } from "@/features/factory/types";
import { GalleryLightbox, type LightboxImage, type LightboxLabels } from "./gallery-lightbox";

/** Full-size file of each photo for the lightbox (and for the links without JavaScript). */
export function lightboxImages(items: { image: MediaImage; alt: string }[]): LightboxImage[] {
  return items.map(({ image, alt }) => ({
    src: mediaSrc(image, Infinity),
    srcSet: mediaSrcSet(image),
    width: image.width,
    height: image.height,
    alt,
  }));
}

const SIZES = {
  // Media tab, Figma 368:12660: main 893×500 r10, 6 thumbs 136×100 r4 16 apart (mobile 773:24904: 288×202.41 r6, 43×34 r2, 6 apart).
  full: {
    main: "aspect-[288/202.41] rounded-md lg:aspect-[893/500] lg:rounded-[10px]",
    mainSizes: "(min-width:1440px) 893px, (min-width:1024px) 62vw, 100vw",
    gap: "gap-2.5 lg:gap-4",
    thumbs: "gap-1.5 lg:gap-4",
    thumb: "h-[34px] rounded-[2px] lg:h-[100px] lg:rounded-[4px]",
  },
  // About tab preview, Figma 368:12059: main 367×260, thumbs 53×53 10 apart (mobile as above).
  preview: {
    main: "aspect-[288/202.41] rounded-md lg:aspect-[367/260] lg:rounded-[10px]",
    mainSizes: "(min-width:1024px) 367px, 100vw",
    gap: "gap-2.5",
    thumbs: "gap-1.5 lg:gap-2.5",
    thumb: "h-[34px] rounded-[2px] lg:h-auto lg:aspect-square lg:rounded-[4px]",
  },
  // Product page, Figma 388:11411 (426.5×381.03 r6, thumbs 63×60 r6, 10 apart) / mobile 775:23614 (288×219 r6, thumbs 45×36 r4, 4 apart).
  product: {
    main: "aspect-[288/219] rounded-md lg:aspect-[426.5/381.03]",
    mainSizes: "(min-width:1440px) 427px, (min-width:1024px) 30vw, 100vw",
    gap: "gap-1 lg:gap-2.5",
    thumbs: "gap-1 lg:gap-2.5",
    thumb: "h-9 rounded-[4px] lg:h-[60px] lg:rounded-md",
  },
} as const;

/**
 * Photos as Figma draws them: the first one large, then up to six thumbnails (all but the first under a 40% black
 * layer, as the "selected" state shows it). Every photo is a link to its full-size file; GalleryLightbox opens those
 * links in the lazy lightbox instead.
 */
export function MediaGallery({
  images,
  name,
  photoLabel,
  labels,
  variant,
  priority = false,
}: {
  images: MediaImage[];
  name: string;
  /** "Şəkil {n}: {name}" */
  photoLabel: string;
  labels: LightboxLabels;
  variant: keyof typeof SIZES;
  /** The photo is the page's main picture: load it at once (LCP). */
  priority?: boolean;
}) {
  if (images.length === 0) return null;
  const s = SIZES[variant];
  const alt = (i: number) => photoLabel.replace("{n}", String(i + 1)).replace("{name}", name);
  const full = lightboxImages(images.map((image, i) => ({ image, alt: alt(i) })));
  const [first] = images;
  return (
    <GalleryLightbox images={full} labels={labels} className={`flex flex-col ${s.gap}`}>
      <a
        href={full[0].src}
        data-index={0}
        aria-label={alt(0)}
        className={`relative block overflow-hidden bg-photo-placeholder bg-cover ${s.main}`}
        style={{ backgroundImage: `url("${first.blur}")` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- own /media route with WebP variants and blur placeholder */}
        <img
          src={mediaSrc(first, 960)}
          srcSet={mediaSrcSet(first)}
          sizes={s.mainSizes}
          width={first.width}
          height={first.height}
          alt=""
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      </a>
      {images.length > 1 && (
        <ul className={`grid grid-cols-6 ${s.thumbs}`}>
          {images.map((image, i) => (
            <li key={image.id}>
              <a
                href={full[i].src}
                data-index={i}
                aria-label={alt(i)}
                className={`relative block overflow-hidden bg-photo-placeholder bg-cover ${s.thumb} ${i > 0 ? "after:absolute after:inset-0 after:bg-black/40 hover:after:bg-black/20" : ""}`}
                style={{ backgroundImage: `url("${image.blur}")` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- own /media route */}
                <img
                  src={mediaSrc(image, 320)}
                  width={image.width}
                  height={image.height}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 size-full object-cover"
                />
              </a>
            </li>
          ))}
        </ul>
      )}
    </GalleryLightbox>
  );
}
