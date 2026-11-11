// Figma icons as static files: no JS, cached forever, colours exactly as drawn.
export type IconName = "phone" | "user-white" | "caret-down" | "caret-right" | "whatsapp" | "list" | "close";
export type SocialName = "facebook" | "instagram" | "linkedin" | "x" | "youtube" | "tiktok";

export function Icon({ name, size, className }: { name: IconName; size: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG from Figma, already optimal
    <img src={`/icons/${name}.svg`} width={size} height={size} alt="" aria-hidden className={className} />
  );
}

export function SocialIcon({ name }: { name: SocialName }) {
  // eslint-disable-next-line @next/next/no-img-element -- static SVG from Figma (40×40 circle)
  return <img src={`/icons/social-${name}.svg`} width={40} height={40} alt="" aria-hidden />;
}
