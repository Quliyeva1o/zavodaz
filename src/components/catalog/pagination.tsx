import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { Icon } from "@/components/ui/icon";
import { pageItems } from "./pagination-items";

/**
 * Figma "Number" 382:11014 …: 40×40 circles, r500, gap 8; current brand-500 + white text, others white + brand-950;
 * "…" is a plain cell. Visible size stays 40, the invisible extension makes the touch target 44.
 * Pure links, no JS.
 */
const cell = "relative flex size-10 items-center justify-center rounded-full text-body-md before:absolute before:-inset-[2px] before:content-['']";

export function Pagination({
  current,
  count,
  hrefFor,
  label,
  lang,
}: {
  current: number;
  count: number;
  hrefFor: (page: number) => string;
  label: string;
  lang: Locale;
}) {
  if (count <= 1) return null;
  const c = dict(lang).catalog;
  const edge = (to: number, icon: "caret-left" | "caret-right", name: string) =>
    to < 1 || to > count ? (
      <span aria-hidden className={`${cell} bg-white opacity-40`}>
        <Icon name={icon} size={20} />
      </span>
    ) : (
      <a href={hrefFor(to)} aria-label={name} rel={to < current ? "prev" : "next"} className={`${cell} bg-white hover:bg-brand-50`}>
        <Icon name={icon} size={20} />
      </a>
    );
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>{edge(current - 1, "caret-left", c.prev)}</li>
        {pageItems(current, count).map((item, i) => (
          <li key={i}>
            {item === "gap" ? (
              <span aria-hidden className={`${cell} bg-white text-brand-950`}>
                ...
              </span>
            ) : item === current ? (
              <a href={hrefFor(item)} aria-current="page" aria-label={c.page.replace("{n}", String(item))} className={`${cell} bg-brand-500 text-white`}>
                {item}
              </a>
            ) : (
              <a href={hrefFor(item)} aria-label={c.page.replace("{n}", String(item))} className={`${cell} bg-white text-brand-950 hover:bg-brand-50`}>
                {item}
              </a>
            )}
          </li>
        ))}
        <li>{edge(current + 1, "caret-right", c.next)}</li>
      </ul>
    </nav>
  );
}
