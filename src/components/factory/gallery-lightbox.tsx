"use client";

import { useState, type ReactNode } from "react";
import { useLazy } from "@/components/ui/use-lazy";
import type { LightboxImage, LightboxLabels, LightboxProps } from "./lightbox";

export type { LightboxImage, LightboxLabels };

/**
 * Turns the server-rendered photo links inside it (`<a data-index>` → the full-size file) into a lightbox. The dialog
 * is not in the page's JS: its chunk is requested on the first click (useLazy).
 * Without JavaScript, or with a modifier key, the link opens the image file itself.
 */
export function GalleryLightbox({ images, labels, className, children }: { images: LightboxImage[]; labels: LightboxLabels; className?: string; children: ReactNode }) {
  const [Lightbox, load] = useLazy((): Promise<(props: LightboxProps) => ReactNode> => import("./lightbox").then((m) => m.Lightbox));
  const [index, setIndex] = useState<number | null>(null);
  return (
    <div
      className={className}
      onClick={(e) => {
        const link = (e.target as Element).closest<HTMLElement>("a[data-index]");
        if (!link || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        const i = Number(link.dataset.index);
        const href = (link as HTMLAnchorElement).href;
        load()
          .then(() => setIndex(i))
          // The chunk failed to load (offline, new deploy): behave like the plain link and open the image file.
          .catch((error) => {
            console.error("lightbox chunk failed to load", error);
            location.href = href;
          });
      }}
    >
      {children}
      {Lightbox && index !== null && <Lightbox images={images} labels={labels} index={index} onIndex={setIndex} onClose={() => setIndex(null)} />}
    </div>
  );
}
