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
  | "check-brand";
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
