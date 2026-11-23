"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { MobileFilterProps } from "./mobile-filter";

// The dialog is not in the page's JS: its chunk is requested on the first click only.
const MobileFilter = dynamic(() => import("./mobile-filter"), { ssr: false });

/**
 * Figma "Button" 736:23890: 288×40, padding 8/10 (9 + border), r4, gray-200 stroke; Funnel 20 + "Filtr" body-md, centred
 * (the button centres its HUG row; Figma's stored child box is stale at the left edge, its render centres it).
 * Mobile only; opens the full-screen dialog (Figma Mob/Filtr). Without JS the server renders a `<noscript>` link
 * to the sidebar instead (catalog-view.tsx).
 */
export function MobileFilterButton({ label, ...dialog }: { label: string } & Omit<MobileFilterProps, "open" | "onClose" | "title">) {
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
        className="relative flex h-10 items-center justify-center gap-1.5 rounded-[4px] border border-gray-200 px-[9px] text-body-md text-brand-950 after:absolute after:inset-x-0 after:-inset-y-1 lg:hidden"
      >
        <Icon name="funnel" size={20} />
        {label}
      </button>
      {loaded && (
        <MobileFilter
          {...dialog}
          title={label}
          open={open}
          onClose={() => {
            setOpen(false);
            ref.current?.focus();
          }}
        />
      )}
    </>
  );
}
