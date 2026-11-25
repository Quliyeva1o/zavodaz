"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useLazy } from "@/components/ui/use-lazy";
import type { RatingLabels } from "./rating-dialog";

/**
 * Figma "Button" 368:11008 (desktop 180×40) / 762:23123 (mobile full width): gray-200 stroke, r4, Star 20 + body-md.
 * Opens the rating dialog. The dialog is not in the page's JS (useLazy: its chunk is requested on the click);
 * when it cannot load, the button says so and a second click tries again. One state: idle / open / failed.
 */
export function RateButton({ label, slug, labels, homeHref }: { label: string; slug: string; labels: RatingLabels; homeHref: string }) {
  const [Dialog, load] = useLazy(() => import("./rating-dialog").then((m) => m.RatingDialog));
  const [state, setState] = useState<"idle" | "open" | "failed">("idle");
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setState("idle");
          load()
            .then(() => setState("open"))
            .catch((error) => {
              console.error("rating dialog chunk failed to load", error);
              setState("failed");
            });
        }}
        className="relative flex h-10 w-full items-center justify-center gap-1.5 rounded-[4px] border border-gray-200 px-2.5 text-body-md text-brand-950 after:absolute after:inset-x-0 after:-inset-y-1"
      >
        <Icon name="star-outline" size={20} />
        {label}
      </button>
      {state === "failed" && (
        <p role="alert" className="text-body-sm text-red-700">
          {labels.errors.load}
        </p>
      )}
      {Dialog && state === "open" && <Dialog slug={slug} labels={labels} homeHref={homeHref} onClose={() => setState("idle")} />}
    </>
  );
}
