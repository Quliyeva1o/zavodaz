import Link from "next/link";
import type { ComponentProps } from "react";

const base = "inline-flex items-center justify-center gap-1.5 rounded-[4px] px-2.5 text-body-md";
const variants = {
  primary: "bg-brand-950 text-white hover:bg-brand-900 disabled:opacity-60",
} as const;
// Figma "Medium 40" (157:2344) and "Medium 36" (mobile 696:19857); "responsive" = 36 on mobile, 40 on desktop.
const sizes = { md: "h-10", sm: "h-9", responsive: "h-9 lg:h-10" } as const;
type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

const cls = (variant: Variant, size: Size, className = "") => `${base} ${sizes[size]} ${variants[variant]} ${className}`;

/** Figma "Button / Primary / Medium 40" (157:2344; hover 12:340 = brand-900) as a <button>. */
export function Button({ variant = "primary", size = "md", className, ...rest }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button {...rest} className={cls(variant, size, className)} />;
}

/** Same look as a link (no prefetch: targets are redirects or dynamic). */
export function ButtonLink({ variant = "primary", size = "md", className, ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link prefetch={false} {...rest} className={cls(variant, size, className)} />;
}
