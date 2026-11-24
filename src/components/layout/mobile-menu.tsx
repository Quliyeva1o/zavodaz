"use client";

import { useRef, useState, type ComponentType } from "react";
import { Icon } from "@/components/ui/icon";
import type { MobileMenuProps } from "./mobile-menu-dialog";

type Dialog = ComponentType<MobileMenuProps & { open: number; onClosed: () => void }>;

/**
 * Header menu button (Figma 40×40, brand-50); opens MobileMenuDialog. R13 (JS budget): the dialog's chunk is requested
 * on the first click only — a plain `import()`, not next/dynamic, whose loader runtime would be in every page's JS.
 */
export function MobileMenu(props: MobileMenuProps) {
  const [open, setOpen] = useState(0);
  const [MobileMenuDialog, setDialog] = useState<{ C: Dialog } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => {
          if (matchMedia("(min-width: 1024px)").matches) return;
          void import("./mobile-menu-dialog").then((m) => {
            setDialog({ C: m.default });
            setOpen((n) => n + 1);
          });
        }}
        aria-haspopup="dialog"
        aria-label={props.labels.open}
        className="flex size-10 items-center justify-center rounded-[4px] bg-brand-50"
      >
        <Icon name="list" size={20} />
      </button>
      {open > 0 && MobileMenuDialog && <MobileMenuDialog.C {...props} open={open} onClosed={() => button.current?.focus()} />}
    </>
  );
}
