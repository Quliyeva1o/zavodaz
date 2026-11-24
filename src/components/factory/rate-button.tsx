"use client";

import { useState, type ComponentType } from "react";
import { Icon } from "@/components/ui/icon";
import type { RatingDialogProps, RatingLabels } from "./rating-dialog";

/**
 * Figma "Button" 368:11008 (desktop 180×40) / 762:23123 (mobile full width): gray-200 stroke, r4, Star 20 + body-md.
 * Opens the rating dialog. The dialog is not in the page's JS: its chunk is requested on the click (plain `import()`,
 * no next/dynamic runtime); when it cannot load, the button says so and a second click tries again.
 */
export function RateButton({ label, slug, labels, homeHref }: { label: string; slug: string; labels: RatingLabels; homeHref: string }) {
  const [box, setBox] = useState<{ Dialog: ComponentType<RatingDialogProps> } | null>(null);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setFailed(false);
          import("./rating-dialog")
            .then((m) => {
              setBox({ Dialog: m.RatingDialog });
              setOpen(true);
            })
            .catch((error) => {
              console.error("rating dialog chunk failed to load", error);
              setFailed(true);
            });
        }}
        className="relative flex h-10 w-full items-center justify-center gap-1.5 rounded-[4px] border border-gray-200 px-2.5 text-body-md text-brand-950 after:absolute after:inset-x-0 after:-inset-y-1"
      >
        <Icon name="star-outline" size={20} />
        {label}
      </button>
      {failed && (
        <p role="alert" className="text-body-sm text-red-700">
          {labels.errors.load}
        </p>
      )}
      {box && open && <box.Dialog slug={slug} labels={labels} homeHref={homeHref} onClose={() => setOpen(false)} />}
    </>
  );
}
