"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { MobileMenuProps } from "./mobile-menu-dialog";

// R13 (JS budget): the menu's chunk is requested on the first click only.
const MobileMenuDialog = dynamic(() => import("./mobile-menu-dialog"), { ssr: false });

/** Header menu button (Figma 40×40, brand-50); opens MobileMenuDialog. */
export function MobileMenu(props: MobileMenuProps) {
  const [open, setOpen] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => !matchMedia("(min-width: 1024px)").matches && setOpen((n) => n + 1)}
        aria-haspopup="dialog"
        aria-label={props.labels.open}
        className="flex size-10 items-center justify-center rounded-[4px] bg-brand-50"
      >
        <Icon name="list" size={20} />
      </button>
      {open > 0 && <MobileMenuDialog {...props} open={open} onClosed={() => button.current?.focus()} />}
    </>
  );
}
