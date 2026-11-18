"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { FieldError, FieldLabel, fieldBox } from "./field";
import { Icon } from "./icon";

export type SelectOption = { value: string; label: string };

type Props = {
  name: string;
  label: string;
  options: SelectOption[];
  placeholder: string;
  error?: string;
  defaultValue?: string;
  required?: boolean;
  requiredMark?: boolean;
  /**
   * "filter": catalog sidebar look — heading 20/26 medium, 16 above the box (Figma 281:7016) — and it works
   * without JS: a native <select> in <noscript> carries the value, the combobox box is marked `data-js-only`
   * (hidden by the sidebar's <noscript> style) and the hidden input stays disabled until hydration, so the
   * value is never sent twice.
   */
  variant?: "form" | "filter";
};

const noop = () => () => {};
/** false on the server and during hydration, true afterwards (no effect, no extra state). */
const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

/**
 * Figma "Dropdown" (52:2273): same box as the input (padding 10/12, gap 6), text 16/20.8 — placeholder gray-700,
 * chosen value brand-950 (Filled 52:2286); CaretDown 20 gray-700, CaretUp when open (52:2310; drawn as the
 * same caret turned over — identical Figma outline). Open list (52:2322): 6px under the box, white, radius 4,
 * padding 10, no stroke or shadow; items "Dropdown Item" (52:2327) 40 high, padding 10/12, radius 4, text
 * gray-700 (Default), bg gray-50 (Hover), text brand-950 + checked box (Active); the box is 16, radius 3.1,
 * 1px brand-200 / brand-950 stroke, check brand-500.
 * A11y: WAI-ARIA "select-only combobox" — focus stays on the combobox, the highlighted option is
 * aria-activedescendant; ↑ ↓ Home End open/move, Enter/Space choose, Escape closes, leaving the field closes.
 * An option highlighted from the keyboard also gets an inset brand-500 ring (the Figma hover fill alone is
 * too faint to see); pointer hover keeps the plain Figma look. A click on the label focuses the combobox.
 * Choosing a new value fires a bubbling `change` on the hidden input (React state alone fires none), so a
 * surrounding form can react (catalog AutoSubmit). Long lists scroll (7 rows visible; the city list).
 * An empty value shows in the placeholder colour (catalog "Hamısı").
 */
export function SelectField({ name, label, options, placeholder, error, defaultValue = "", required, requiredMark, variant = "form" }: Props) {
  const id = `f-${name}`;
  const hidden = useRef<HTMLInputElement>(null);
  const filter = variant === "filter";
  const hydrated = useHydrated();
  /** Scroll the highlighted option into view on the next render: set when the list opens and on keyboard moves, never on hover. */
  const reveal = useRef(false);
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  /** The highlight was moved with the keyboard (→ visible focus ring), not by the pointer. */
  const [keyboard, setKeyboard] = useState(false);
  const selected = options.find((o) => o.value === value);
  const current = Math.max(0, options.findIndex((o) => o.value === value));
  const clamp = (i: number) => Math.max(0, Math.min(options.length - 1, i));

  function show(at: number, byKeyboard: boolean) {
    reveal.current = true;
    setActive(clamp(at));
    setKeyboard(byKeyboard);
    setOpen(true);
  }
  function choose(i: number) {
    const next = options[i].value;
    setOpen(false);
    if (next === value) return;
    setValue(next);
    const input = hidden.current;
    if (input) {
      input.value = next;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  useEffect(() => {
    if (!open || !reveal.current) return;
    reveal.current = false;
    document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);

  function onKey(e: KeyboardEvent) {
    const last = options.length - 1;
    if (!open) {
      const at: Record<string, number> = { ArrowDown: current, ArrowUp: current, Enter: current, " ": current, Home: 0, End: last };
      if (e.key in at) {
        e.preventDefault();
        show(at[e.key], true);
      }
      return;
    }
    const moves: Record<string, number> = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: last };
    if (e.key in moves) {
      e.preventDefault();
      reveal.current = true;
      setActive(clamp(moves[e.key]));
      setKeyboard(true);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div className={`flex flex-col ${variant === "filter" ? "gap-4" : "gap-1.5"}`}>
      <FieldLabel
        id={`${id}-label`}
        htmlFor={id}
        label={label}
        requiredMark={requiredMark}
        className={variant === "filter" ? "flex min-h-[26px] text-subtitle-2-medium text-brand-950" : undefined}
      />
      <input ref={hidden} type="hidden" name={name} value={value} readOnly disabled={filter && !hydrated} />
      {filter && (
        <noscript>
          <select name={name} defaultValue={value} aria-labelledby={`${id}-label`} className={`h-10 text-subtitle-2s ${fieldBox}`}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </noscript>
      )}
      <div className="relative" data-js-only={filter || undefined}>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-labelledby={`${id}-label`}
          aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
          aria-required={required || undefined}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          // Mouse clicks toggle the list. Clicks with detail 0 come from the keyboard (handled in onKey) or
          // from the <label>: those only focus the combobox, like a native <select>.
          onClick={(e) => {
            if (e.detail === 0) e.currentTarget.focus();
            else if (open) setOpen(false);
            else show(current, false);
          }}
          onKeyDown={onKey}
          onBlur={() => setOpen(false)}
          className={`flex h-10 items-center justify-between gap-1.5 text-left text-subtitle-2s ${fieldBox}`}
        >
          <span className={`truncate ${selected && value ? "text-brand-950" : "text-gray-700"}`}>{selected?.label ?? placeholder}</span>
          <Icon name="caret-down" size={20} className={`shrink-0 ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <ul
            id={`${id}-list`}
            role="listbox"
            aria-labelledby={`${id}-label`}
            // Keep focus on the combobox while an option is pressed.
            onMouseDown={(e) => e.preventDefault()}
            className="absolute inset-x-0 top-[calc(100%+6px)] z-20 flex max-h-[290px] flex-col overflow-y-auto rounded-[4px] bg-white p-2.5"
          >
            {options.map((o, i) => {
              const isSelected = o.value === value;
              return (
                <li
                  key={o.value}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onPointerMove={() => {
                    setActive(i);
                    setKeyboard(false);
                  }}
                  onClick={() => choose(i)}
                  className={`flex h-10 shrink-0 cursor-pointer items-center justify-between gap-1 rounded-[4px] px-3 text-subtitle-2s ${
                    isSelected ? "text-brand-950" : "text-gray-700"
                  } ${i === active ? "bg-gray-50" : "bg-white"} ${i === active && keyboard ? "ring-2 ring-inset ring-brand-500" : ""}`}
                >
                  <span className="truncate">{o.label}</span>
                  <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden>
                    <span
                      className={`flex size-4 items-center justify-center rounded-[3.1px] border ${
                        isSelected ? "border-brand-950" : "border-brand-200"
                      }`}
                    >
                      {isSelected && <Icon name="check-brand" size={16} className="max-w-none shrink-0" />}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {error && <FieldError id={`${id}-err`} message={error} />}
    </div>
  );
}
