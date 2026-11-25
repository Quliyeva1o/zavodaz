import { Icon } from "@/components/ui/icon";

export type Crumb = { label: string; href?: string };

/**
 * Figma 144:4008 (desktop) / 685:21532 (mobile): body-sm 14/21, gap 10, CaretRight 18; the last item is the
 * current page. Mobile Figma shows only the caret + current page, so the first item stays for screen readers only.
 */
export function Breadcrumb({ items, label }: { items: Crumb[]; label: string }) {
  return (
    <nav aria-label={label} className="flex min-h-[21px] flex-wrap items-center gap-2.5 text-body-sm">
      {items.map((c, i) => (
        <span key={i} className={`flex items-center gap-2.5${i === 0 ? " max-lg:sr-only" : ""}`}>
          {i > 0 && <Icon name="caret-right" size={18} />}
          {c.href ? (
            <a href={c.href} className="relative text-gray-500 before:absolute before:inset-x-0 before:-inset-y-3">
              {c.label}
            </a>
          ) : (
            <span aria-current="page" className="text-brand-950">
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
