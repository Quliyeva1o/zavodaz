"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { catalogSearch } from "@/features/catalog/filter";
import { FACTORY_TYPES, type CatalogFilter, type CatalogScope } from "@/features/catalog/types";
import { Icon } from "@/components/ui/icon";

type FilterKey = "type" | "industry" | "city" | "product" | "model" | "coop" | "sort";
export type FilterGroup = {
  key: FilterKey;
  title: string;
  /** "" is the "Hamısı" option. */
  options: { value: string; label: string }[];
};

export type MobileFilterProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  groups: FilterGroup[];
  filter: CatalogFilter;
  scope: CatalogScope;
  basePath: string;
  labels: { back: string; reset: string };
};

/** The group's current value(s) as option values ("" = Hamısı). */
function selected(f: CatalogFilter, key: FilterKey): string[] {
  const v = key === "type" ? f.types : key === "sort" ? (f.sort === "default" ? "" : f.sort) : f[key];
  return Array.isArray(v) ? v : v ? [v] : [];
}

/** The filter with one option applied; any change starts again from page 1. */
function withValue(f: CatalogFilter, key: FilterKey, value: string, on: boolean): CatalogFilter {
  const next = { ...f, page: 1 };
  if (key === "type") {
    const set = new Set<string>(value === "" ? [] : on ? [...f.types, value] : f.types.filter((t) => t !== value));
    return { ...next, types: FACTORY_TYPES.filter((t) => set.has(t)) };
  }
  if (key === "sort") return { ...next, sort: value === "" ? "default" : (value as CatalogFilter["sort"]) };
  return { ...next, [key]: value === "" ? null : value };
}

/**
 * Full-screen filter dialog, Figma Mob/Filtr 737:22004 (list) + 758:22171 … 761:22772 (option screens), all
 * 320×568: padding 20/16, gap 26; back button 40×40 (brand-50, r4); rows 288×24, gap 16 (18/24.3 medium,
 * CaretRight 20); option rows 288×20, gap 16 (16/20.8, brand-950 when chosen else gray-700, 16×16 box r3.1).
 * Native <dialog>: focus trap and Escape for free; focus goes to the heading on every screen change.
 * Choosing applies at once (router.push); single-select returns to the list, types (multi) stay on the screen.
 */
export default function MobileFilter({ open, onClose, title, groups, filter, scope, basePath, labels }: MobileFilterProps) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const [screen, setScreen] = useState<FilterKey | null>(null);
  const group = groups.find((g) => g.key === screen);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setScreen(null);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (open) heading.current?.focus();
  }, [open, screen]);

  // Desktop shows the sidebar: a dialog left open across the breakpoint would trap the page.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const close = () => mq.matches && onClose();
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, [onClose]);

  const choose = (g: FilterGroup, value: string) => {
    const multi = g.key === "type";
    const next = withValue(filter, g.key, value, multi && !selected(filter, g.key).includes(value));
    router.push(basePath + catalogSearch(next, scope), { scroll: false });
    if (!multi) setScreen(null);
  };
  const current = group ? selected(filter, group.key) : [];
  const multi = group?.key === "type";

  return (
    <dialog
      ref={ref}
      data-mobile-filter=""
      aria-modal="true"
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-0 h-full max-h-none w-full max-w-none overflow-y-auto bg-white p-0 backdrop:bg-black/20"
    >
      <div className="flex min-h-full flex-col items-start gap-[26px] px-4 py-5">
        <div className="flex w-full flex-col gap-4">
          <button
            type="button"
            onClick={() => (screen ? setScreen(null) : onClose())}
            aria-label={labels.back}
            className="relative flex size-10 items-center justify-center rounded-[4px] bg-brand-50 after:absolute after:-inset-1"
          >
            <Icon name="caret-left" size={20} />
          </button>
          <div className="flex flex-col gap-4">
            <h2 ref={heading} id={titleId} tabIndex={-1} className={`h-6 text-subtitle-3-medium text-brand-950 outline-none ${group ? "" : "sr-only"}`}>
              {group ? group.title : title}
            </h2>
            {group ? (
              <div role={multi ? "group" : "radiogroup"} aria-labelledby={titleId} className="flex flex-col gap-4">
                {group.options.map((o) => {
                  const on = o.value === "" ? current.length === 0 : current.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role={multi ? "checkbox" : "radio"}
                      aria-checked={on}
                      onClick={() => choose(group, o.value)}
                      className={`relative flex h-5 w-full items-center gap-1 text-left text-[16px] leading-[20.8px] after:absolute after:inset-x-0 after:-inset-y-3 ${on ? "text-brand-950" : "text-gray-700"}`}
                    >
                      <span className="min-w-0 flex-1">{o.label}</span>
                      <span aria-hidden className="flex size-5 shrink-0 items-center justify-center">
                        <span className={`flex size-4 items-center justify-center rounded-[3.1px] border ${on ? "border-brand-950" : "border-gray-300"}`}>
                          {on && <Icon name="check-brand" size={16} className="max-w-none shrink-0" />}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              groups.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setScreen(g.key)}
                  className="relative flex h-6 w-full items-center justify-between gap-4 text-left text-subtitle-3-medium text-brand-950 after:absolute after:inset-x-0 after:-inset-y-2.5"
                >
                  {g.title}
                  <Icon name="caret-right" size={20} className="shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
        {!group && (
          <>
            <div aria-hidden className="relative h-0 w-full after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-gray-200" />
            <button type="button" onClick={() => router.push(basePath, { scroll: false })} className="relative min-h-[21px] text-body-sm text-brand-500 before:absolute before:-inset-3">
              {labels.reset}
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}
