"use client";

import { useEffect, useRef } from "react";

/**
 * The shared open/close wiring of a native <dialog> (Modal, MobileFilter): `open` drives showModal()/close().
 * The browser supplies the focus trap, Escape, background inertness and focus restoring; the caller keeps
 * `open` in sync through the dialog's `onClose`.
 */
export function useModalDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return ref;
}
