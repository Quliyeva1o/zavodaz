"use client";

import { useRef, useState, type ComponentType } from "react";
import { Icon } from "@/components/ui/icon";
import { useLazy } from "@/components/ui/use-lazy";
import type { MobileFilterProps } from "./mobile-filter";

/**
 * Figma "Button" 736:23890: 288×40, padding 8/10 (9 + border), r4, gray-200 stroke; Funnel 20 + "Filtr" body-md, centred
 * (the button centres its HUG row; Figma's stored child box is stale at the left edge, its render centres it).
 * Mobile only; opens the full-screen dialog (Figma Mob/Filtr). Without JS the server renders a `<noscript>` link
 * to the sidebar instead (catalog-view.tsx).
 */
export function MobileFilterButton({ label, ...dialog }: { label: string } & Omit<MobileFilterProps, "open" | "onClose" | "title">) {
  // The dialog is not in the page's JS: its chunk is requested on the first click (useLazy).
  const [MobileFilter, load] = useLazy((): Promise<ComponentType<MobileFilterProps>> => import("./mobile-filter").then((m) => m.default));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-haspopup="dialog"
        onClick={() =>
          load()
            .then(() => setOpen(true))
            // The chunk failed to load: log, and fall back to the no-JS anchor (the sidebar, shown with :target).
            .catch((error) => {
              console.error("filter dialog chunk failed to load", error);
              location.hash = "filtr";
            })
        }
        className="relative flex h-10 items-center justify-center gap-1.5 rounded-[4px] border border-gray-200 px-[9px] text-body-md text-brand-950 after:absolute after:inset-x-0 after:-inset-y-1 lg:hidden"
      >
        <Icon name="funnel" size={20} />
        {label}
      </button>
      {MobileFilter && (
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
