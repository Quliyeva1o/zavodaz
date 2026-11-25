"use client";

import { useRef, useState, type ComponentType } from "react";
import { Icon } from "@/components/ui/icon";
import { useLazy } from "@/components/ui/use-lazy";
import type { MobileMenuProps } from "./mobile-menu-dialog";

type Dialog = ComponentType<MobileMenuProps & { open: number; onClosed: () => void }>;

/**
 * Header menu button (Figma 40×40, brand-50); opens MobileMenuDialog. R13 (JS budget): the dialog's chunk is requested
 * on the first click only (useLazy, a plain `import()`; next/dynamic's loader runtime would be in every page's JS).
 */
export function MobileMenu(props: MobileMenuProps) {
  const [open, setOpen] = useState(0);
  const [MobileMenuDialog, load] = useLazy((): Promise<Dialog> => import("./mobile-menu-dialog").then((m) => m.default));
  const button = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => {
          if (matchMedia("(min-width: 1024px)").matches) return;
          load()
            .then(() => setOpen((n) => n + 1))
            // The chunk failed to load: log, and jump to the footer links (the page has no other no-JS menu).
            .catch((error) => {
              console.error("menu dialog chunk failed to load", error);
              location.hash = "footer";
            });
        }}
        aria-haspopup="dialog"
        aria-label={props.labels.open}
        className="flex size-10 items-center justify-center rounded-[4px] bg-brand-50"
      >
        <Icon name="list" size={20} />
      </button>
      {open > 0 && MobileMenuDialog && <MobileMenuDialog {...props} open={open} onClosed={() => button.current?.focus()} />}
    </>
  );
}
