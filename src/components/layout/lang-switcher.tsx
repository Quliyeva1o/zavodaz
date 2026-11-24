"use client";

import { useEffect, useRef, useState } from "react";
import { locales, type Locale } from "@/i18n/config";
import { Icon } from "@/components/ui/icon";

type Props = { lang: Locale; labels: Record<Locale, string>; languageLabel: string };

export function LangSwitcher({ lang, labels, languageLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [hrefs, setHrefs] = useState<Record<Locale, string> | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("mousedown", close);
    addEventListener("keydown", esc);
    return () => {
      removeEventListener("mousedown", close);
      removeEventListener("keydown", esc);
    };
  }, [open]);

  const toggle = async () => {
    if (open) return setOpen(false);
    // The public URL is only known in the browser (the proxy rewrites it internally). The route tables are
    // loaded on the first click, not with the page (R13: JS budget).
    const { switchLocalePath } = await import("@/i18n/routes");
    setHrefs(Object.fromEntries(locales.map((l) => [l, switchLocalePath(location.pathname, l)])) as Record<Locale, string>);
    setOpen(true);
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={`${languageLabel}: ${labels[lang]}`}
        className="flex h-10 w-[66px] items-center justify-center gap-1.5 rounded-[4px] border border-gray-200 px-2.5 text-body-md text-brand-950"
      >
        {labels[lang]}
        <Icon name="caret-down" size={20} />
      </button>
      {open && hrefs && (
        <ul className="absolute top-full right-0 z-20 mt-1 w-[66px] overflow-hidden rounded-[4px] border border-gray-200 bg-white">
          {locales.map((l) => (
            <li key={l}>
              <a
                href={hrefs[l]}
                hrefLang={l}
                aria-current={l === lang ? "true" : undefined}
                className="block px-2.5 py-2 text-center text-body-md text-brand-950 hover:bg-gray-50 aria-[current]:bg-gray-50"
              >
                {labels[l]}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
