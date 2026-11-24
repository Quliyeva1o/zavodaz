"use client";

import { useEffect, useRef, useState } from "react";
import { locales, type Locale } from "@/i18n/config";
import { switchLocalePath } from "@/i18n/routes";
import { Icon } from "@/components/ui/icon";
import { WhatsAppLink } from "@/components/ui/whatsapp-link";
import { telHref } from "@/features/settings/links";

export type MobileMenuProps = {
  lang: Locale;
  links: { href: string; label: string; box: { height?: number } }[];
  languageLabels: Record<Locale, string>;
  labels: { open: string; close: string; whatsapp: string; language: string };
  phone: string;
  whatsapp: string;
};

/**
 * The menu itself, loaded on the first click of the menu button (mobile-menu.tsx), so it is not in the
 * page's initial JS. `open` counts the clicks: every new value opens the dialog again.
 * Native <dialog>: focus trap, Escape and background inertness come from the browser.
 */
export default function MobileMenuDialog({ lang, links, languageLabels, labels, phone, whatsapp, open, onClosed }: MobileMenuProps & { open: number; onClosed: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [hrefs, setHrefs] = useState<Record<Locale, string> | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d || open === 0 || matchMedia("(min-width: 1024px)").matches) return;
    setHrefs(Object.fromEntries(locales.map((l) => [l, switchLocalePath(location.pathname, l)])) as Record<Locale, string>);
    if (!d.open) d.showModal();
  }, [open]);

  // The dialog sits inside an lg:hidden wrapper: close it when the viewport grows to desktop,
  // otherwise it stays modal (page inert) under a display:none ancestor.
  useEffect(() => {
    const mq = matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && dialog.current?.close();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <dialog
      ref={dialog}
      onClose={onClosed}
      data-figma="mobile-menu"
      className="m-0 h-dvh max-h-none w-full max-w-none bg-white p-0 backdrop:bg-transparent"
    >
      <div className="flex flex-col gap-[26px] px-4 py-5">
        <div className="flex flex-col items-end gap-4">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label={labels.close}
            className="flex size-10 items-center justify-center rounded-[4px] bg-brand-50"
          >
            <Icon name="close" size={20} />
          </button>
          <nav className="flex w-full flex-col gap-6">
            {links.map((l) => (
              // ::before widens the tap area to ≥ 44px without moving anything
              <a
                key={l.href}
                href={l.href}
                style={{ height: l.box.height }}
                className="relative before:absolute before:inset-x-0 before:-inset-y-[11px] text-subtitle-2-medium text-brand-950"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
        <div role="group" aria-label={labels.language} className="flex h-[52px] items-center rounded-full bg-gray-50 p-1">
          {locales.map((l) => (
            <a
              key={l}
              href={hrefs?.[l] ?? "#"}
              hrefLang={l}
              aria-current={l === lang ? "true" : undefined}
              className="flex h-11 flex-1 items-center justify-center rounded-full px-4 text-subtitle-3 text-gray-500 aria-[current]:bg-white aria-[current]:text-brand-950"
            >
              {languageLabels[l]}
            </a>
          ))}
        </div>
        {/* Figma line is 0 high and draws its 1px stroke above its position */}
        <hr className="-mt-px border-gray-200" />
        <div className="flex flex-col gap-3.5">
          <a href={telHref(phone)} className="flex h-6 items-center gap-1.5 text-body-md text-brand-950">
            <Icon name="phone" size={20} />
            {phone}
          </a>
          <WhatsAppLink number={whatsapp} label={labels.whatsapp} className="w-full px-[23px]" />
        </div>
      </div>
    </dialog>
  );
}
