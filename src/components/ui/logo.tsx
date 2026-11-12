// Figma logo nodes have fractional sizes; Figma's PNG export rounds them up to whole pixels.
// The bitmap is drawn 1:1 at its exported size (no resampling blur), while the layout box keeps
// the exact Figma size, so everything after the logo lands where Figma puts it.
const SIZES = {
  // img: exported PNG @1x, box: Figma node width × height
  header: { img: [168, 87], box: [167.259, 86.831] }, // 143:1693 "Logotype"
  "header-mobile": { img: [89, 46], box: [88.283, 45.831] }, // 685:20712 "Logotype"
  footer: { img: [206, 113], box: [206, 112.975] }, // I143:2121;52:3439 "Png Logo 1"
  "footer-mobile": { img: [114, 62], box: [113.277, 61.061] }, // I685:21139;682:20130 "Png Logo 1"
} as const;

export type LogoVariant = keyof typeof SIZES;

/** Figma logo (PNG in the design file) as lossless WebP for 1x / 2x / 3x screens. */
export function Logo({ variant, priority = false }: { variant: LogoVariant; priority?: boolean }) {
  const { img, box } = SIZES[variant];
  const src = (scale: number) => `/brand/logo-${variant}@${scale}x.webp`;
  return (
    <span className="block" style={{ width: box[0], height: box[1] }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized brand asset, no optimisation needed */}
      <img
        src={src(1)}
        srcSet={`${src(1)} 1x, ${src(2)} 2x, ${src(3)} 3x`}
        width={img[0]}
        height={img[1]}
        alt="Zavod.az"
        fetchPriority={priority ? "high" : undefined}
        className="block max-w-none"
      />
    </span>
  );
}
