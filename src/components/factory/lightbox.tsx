"use client";

import { useModalDialog } from "@/components/ui/use-modal-dialog";
import { Icon } from "@/components/ui/icon";

export type LightboxImage = { src: string; srcSet: string; width: number; height: number; alt: string };
export type LightboxLabels = { close: string; prev: string; next: string; counter: string };
export type LightboxProps = {
  images: LightboxImage[];
  labels: LightboxLabels;
  index: number;
  onIndex: (index: number) => void;
  /** The dialog closed (Escape, the close button, a click beside the photo): the caller unmounts it. */
  onClose: () => void;
};

const roundButton = "absolute flex size-11 items-center justify-center rounded-full bg-white hover:bg-gray-100";

/**
 * Photo lightbox (no Figma frame: the design only shows the gallery). A native modal <dialog> (useModalDialog): the
 * browser traps focus, closes on Escape and gives focus back to the photo link. ← / → (and the buttons) move through
 * the photos, wrapping around; the counter is announced. Loaded lazily by GalleryLightbox on the first click.
 */
export function Lightbox({ images, labels, index, onIndex, onClose }: LightboxProps) {
  const ref = useModalDialog(true);
  const count = images.length;
  const image = images[index];
  const go = (step: number) => onIndex((index + step + count) % count);
  const close = () => ref.current?.close();
  return (
    <dialog
      ref={ref}
      aria-label={image.alt}
      onClose={onClose}
      onKeyDown={(e) => {
        if (count < 2) return;
        if (e.key === "ArrowRight") go(1);
        else if (e.key === "ArrowLeft") go(-1);
        else return;
        e.preventDefault();
      }}
      className="m-0 size-full max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/80"
    >
      <div
        className="flex size-full flex-col items-center justify-center gap-4 px-4 py-16 lg:px-20"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- own /media route with WebP variants */}
        <img
          key={image.src}
          src={image.src}
          srcSet={image.srcSet}
          sizes="100vw"
          width={image.width}
          height={image.height}
          alt={image.alt}
          className="h-auto max-h-full w-auto max-w-full rounded-md object-contain"
        />
        <p aria-live="polite" className="text-body-sm text-white">
          {labels.counter.replace("{n}", String(index + 1)).replace("{total}", String(count))}
        </p>
      </div>
      <button type="button" onClick={close} aria-label={labels.close} className={`${roundButton} right-4 top-4`}>
        <Icon name="close" size={20} />
      </button>
      {count > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label={labels.prev} className={`${roundButton} left-4 top-1/2 -translate-y-1/2`}>
            <Icon name="caret-left" size={20} />
          </button>
          <button type="button" onClick={() => go(1)} aria-label={labels.next} className={`${roundButton} right-4 top-1/2 -translate-y-1/2`}>
            <Icon name="caret-right" size={20} />
          </button>
        </>
      )}
    </dialog>
  );
}
