import type { ComponentProps } from "react";

// `after:` extends the hit area to >= 44px (36 -> 44, 40 -> 48) without changing the drawn size.
const base = "relative after:absolute after:inset-x-0 after:-inset-y-1 inline-flex items-center justify-center gap-1.5 rounded-[4px] px-2.5 text-body-md";
const variants = {
  primary: "bg-brand-950 text-white hover:bg-brand-900 disabled:opacity-60",
} as const;
// Figma "Medium 40" (157:2344) and "Medium 36" (mobile 696:19857); "responsive" = 36 on mobile, 40 on desktop;
// "lg" = the 48px form button (contact 153:4674, popup 244:9746: padding 8/10).
const sizes = { md: "h-10", sm: "h-9", responsive: "h-9 lg:h-10", lg: "h-12" } as const;
type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

/** Class string for plain `<a>` buttons (route-handler targets, where next/link would only add a useless RSC fetch). */
export const buttonClass = (variant: Variant, size: Size, className = "") => `${base} ${sizes[size]} ${variants[variant]} ${className}`;

/** Figma "Button / Primary / Medium 40" (157:2344; hover 12:340 = brand-900) as a <button>. */
export function Button({ variant = "primary", size = "md", className, ...rest }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button {...rest} className={buttonClass(variant, size, className)} />;
}

/** Same look as a link (no prefetch: targets are redirects or dynamic). */
export function ButtonLink({ variant = "primary", size = "md", className, ...rest }: ComponentProps<"a"> & { variant?: Variant; size?: Size }) {
  return <a {...rest} className={buttonClass(variant, size, className)} />;
}
