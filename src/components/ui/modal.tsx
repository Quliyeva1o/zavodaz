"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./icon";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children?: ReactNode;
  /** Bottom row (Figma: one full-width 48px button). */
  actions?: ReactNode;
};

/**
 * Figma "Pop up" (244:9721, inside frame 244:9480): 412 wide, padding 24, radius 10, white, no shadow; page dimmed
 * black 20% (244:9536). Title H4 28/34.72 brand-950 next to an X 32 (brand-500), gap 16; title → text 24
 * (Body 16/24 gray-500); content → actions 40. Native <dialog>: focus trap, Escape and the top layer for free;
 * focus starts on the close button.
 */
export function Modal({ open, onClose, title, closeLabel, children, actions }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto w-[412px] max-w-[calc(100%-32px)] rounded-[10px] bg-white p-6 backdrop:bg-black/20"
    >
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <h2 id={titleId} className="min-w-0 flex-1 text-h4 text-brand-950">
              {title}
            </h2>
            <button
              type="button"
              autoFocus
              onClick={onClose}
              aria-label={closeLabel}
              className="relative size-8 shrink-0 rounded-[4px] after:absolute after:-inset-1.5"
            >
              <Icon name="x-brand" size={32} />
            </button>
          </div>
          {children}
        </div>
        {actions}
      </div>
    </dialog>
  );
}
