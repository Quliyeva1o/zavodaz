"use client";

import { useState, type ReactNode } from "react";
import type { LightboxImage, LightboxLabels, LightboxProps } from "./lightbox";

export type { LightboxImage, LightboxLabels };

type Box = (props: LightboxProps) => ReactNode;

/**
 * Turns the server-rendered photo links inside it (`<a data-index>` → the full-size file) into a lightbox. The dialog
 * is not in the page's JS: its chunk is requested on the first click (plain `import()`, no next/dynamic runtime).
 * Without JavaScript, or with a modifier key, the link opens the image file itself.
 */
export function GalleryLightbox({ images, labels, className, children }: { images: LightboxImage[]; labels: LightboxLabels; className?: string; children: ReactNode }) {
  const [box, setBox] = useState<{ Lightbox: Box } | null>(null);
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
        import("./lightbox")
          .then((m) => {
            setBox({ Lightbox: m.Lightbox });
            setIndex(i);
          })
          // The chunk failed to load (offline, new deploy): behave like the plain link and open the image file.
          .catch((error) => {
            console.error("lightbox chunk failed to load", error);
            location.href = href;
          });
      }}
    >
      {children}
      {box && index !== null && <box.Lightbox images={images} labels={labels} index={index} onIndex={setIndex} onClose={() => setIndex(null)} />}
    </div>
  );
}
