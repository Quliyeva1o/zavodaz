"use client";

import { useEffect, useRef } from "react";

/** Id of the control that changed; the filter form remounts after the navigation and focus returns to it. */
let refocus: string | null = null;

/**
 * Catalog filter form behaviour (the form itself is server-rendered `next/form`):
 * - any `change` submits the form (client-side navigation, no button needed);
 * - empty values ("Hamısı") are left out of the URL (`formdata` event), so `?city=baki` stays clean;
 * - the "Hamısı" checkbox (`data-all="<name>"`, no name of its own) clears the group, and is checked again
 *   when the group becomes empty;
 * - radio changes wait 400 ms: arrow keys move through a radio group (coop, rating) one change per key,
 *   and only the last one should navigate.
 */
export function AutoSubmit() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    if (refocus) document.getElementById(refocus)?.focus();
    refocus = null;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const submit = () => {
      refocus = document.activeElement?.id || null;
      form.requestSubmit();
    };
    const onChange = (e: Event) => {
      const input = e.target as HTMLInputElement;
      const group = input.dataset.all ?? (input.type === "checkbox" ? input.name : "");
      if (group) {
        const all = form.querySelector<HTMLInputElement>(`[data-all="${group}"]`);
        const items = [...form.querySelectorAll<HTMLInputElement>(`input[name="${group}"]`)];
        if (input === all) {
          if (!all.checked) {
            all.checked = true; // "Hamısı" cannot be turned off by itself
            return;
          }
          for (const i of items) i.checked = false;
        } else if (all) {
          all.checked = !items.some((i) => i.checked);
        }
      }
      clearTimeout(timer);
      if (input.type === "radio") timer = setTimeout(submit, 400);
      else submit();
    };
    const onFormData = (e: FormDataEvent) => {
      for (const [name, value] of [...e.formData]) if (value === "") e.formData.delete(name);
    };
    form.addEventListener("change", onChange);
    form.addEventListener("formdata", onFormData);
    return () => {
      clearTimeout(timer);
      form.removeEventListener("change", onChange);
      form.removeEventListener("formdata", onFormData);
    };
  }, []);

  return <span ref={ref} hidden />;
}
