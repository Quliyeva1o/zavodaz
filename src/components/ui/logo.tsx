const SIZES = {
  header: [167, 87],
  "header-mobile": [88, 46],
  footer: [206, 113],
  "footer-mobile": [113, 61],
} as const;

export type LogoVariant = keyof typeof SIZES;

/** Figma logo (PNG in the design file) as lossless WebP for 1x / 2x / 3x screens. */
export function Logo({ variant, priority = false }: { variant: LogoVariant; priority?: boolean }) {
  const [width, height] = SIZES[variant];
  const src = (scale: number) => `/brand/logo-${variant}@${scale}x.webp`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pre-sized brand asset, no optimisation needed
    <img
      src={src(1)}
      srcSet={`${src(1)} 1x, ${src(2)} 2x, ${src(3)} 3x`}
      width={width}
      height={height}
      alt="Zavod.az"
      fetchPriority={priority ? "high" : undefined}
      className="block"
    />
  );
}
