// Figma icons as static files: no JS, cached forever, colours exactly as drawn.
export type IconName =
  | "phone"
  | "user-white"
  | "caret-down"
  | "caret-right"
  | "whatsapp"
  | "list"
  | "close"
  | "check-circle"
  | "caret-up"
  | "caret-down-brand"
  | "asterisk"
  | "diamonds-four"
  | "crown-simple"
  | "phone-24"
  | "envelope-simple"
  | "warning-circle"
  | "notches"
  | "x-brand"
  | "check-brand"
  | "seal-check"
  | "star"
  | "star-half"
  | "funnel"
  | "caret-left"
  // Factory page (step 3), exported as SVG from the Figma UI on 2026-11-25/26 (the API was rate-limited):
  // GlobeSimple 331:10244, MapPin 331:10247, FilePdf 381:10826, DownloadSimple 381:10830, Play 368:12057
  // (backdrop blur dropped from the file, done in CSS). star-outline = Star component 368:11019 with the
  // "Qiymətləndir" button instance's size and colour (I368:11008;12:481: 20px, #494C5B).
  | "globe-simple"
  | "map-pin"
  | "star-outline"
  | "play"
  | "file-pdf"
  | "download-simple";
export type SocialName = "facebook" | "instagram" | "linkedin" | "x" | "youtube" | "tiktok";

export function Icon({ name, size, className }: { name: IconName; size: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG from Figma, already optimal
    <img src={`/icons/${name}.svg`} width={size} height={size} alt="" aria-hidden className={className} />
  );
}

export function SocialIcon({ name, variant = "dark", size, className }: { name: SocialName; variant?: "dark" | "light"; size?: number; className?: string }) {
  const file = variant === "light" ? `social-light-${name}` : `social-${name}`;
  const px = size ?? (variant === "light" ? 44 : 40);
  // eslint-disable-next-line @next/next/no-img-element -- static SVG from Figma
  return <img src={`/icons/${file}.svg`} width={px} height={px} alt="" aria-hidden className={className} />;
}
