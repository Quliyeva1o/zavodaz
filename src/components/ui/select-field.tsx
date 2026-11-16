"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
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
  requiredMark?: boolean;
};

/**
 * Figma "Dropdown" (52:2273): same box as the input (padding 10/12, gap 6), text 16/20.8 — placeholder gray-700,
 * chosen value brand-950 (Filled 52:2286); CaretDown 20 gray-700, CaretUp when open (52:2310; drawn as the
 * same caret turned over — identical Figma outline). Open list (52:2322): 6px under the box, white, radius 4,
 * padding 10; items "Dropdown Item" (52:2327) 40 high, padding 10/12, radius 4, text gray-700 (Default),
 * bg gray-50 (Hover), text brand-950 + checked box (Active); the box is 16, radius 3.1, 1px brand-200 /
 * brand-950 stroke, check brand-500.
 * A11y: button (aria-haspopup=listbox) + listbox with aria-activedescendant; ↑ ↓ Home End Enter Space Escape Tab.
 */
export function SelectField({ name, label, options, placeholder, error, defaultValue = "", requiredMark }: Props) {
  const id = `f-${name}`;
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const selected = options.find((o) => o.value === value);

  function show(at: number) {
    setActive(Math.max(0, Math.min(options.length - 1, at)));
    setOpen(true);
  }
  function close(refocus: boolean) {
    setOpen(false);
    if (refocus) button.current?.focus();
  }
  function choose(i: number) {
    setValue(options[i].value);
    close(true);
  }

  // Focus moves into the list when it opens; a press outside closes it.
  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const current = Math.max(0, options.findIndex((o) => o.value === value));

  function onButtonKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      show(selected ? current : e.key === "ArrowUp" ? options.length - 1 : 0);
    }
  }

  function onListKey(e: KeyboardEvent) {
    const moves: Record<string, number> = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: options.length - 1 };
    if (e.key in moves) {
      e.preventDefault();
      setActive(Math.max(0, Math.min(options.length - 1, moves[e.key])));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={root} className="flex flex-col gap-1.5">
      <FieldLabel id={`${id}-label`} htmlFor={id} label={label} requiredMark={requiredMark} />
      <input type="hidden" name={name} value={value} readOnly />
      <div className="relative">
        <button
          ref={button}
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-labelledby={`${id}-label ${id}`}
          // aria-invalid is not allowed on a button: the error is announced through aria-describedby.
          data-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          onClick={() => (open ? close(true) : show(current))}
          onKeyDown={onButtonKey}
          className={`flex h-10 items-center justify-between gap-1.5 text-left text-subtitle-2s ${fieldBox} data-invalid:border-red-700`}
        >
          <span className={`truncate ${selected ? "text-brand-950" : "text-gray-700"}`}>{selected?.label ?? placeholder}</span>
          <Icon name="caret-down" size={20} className={`shrink-0 ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <ul
            ref={list}
            id={`${id}-list`}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={`${id}-label`}
            aria-activedescendant={`${id}-opt-${active}`}
            onKeyDown={onListKey}
            onBlur={(e) => {
              if (!root.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
            }}
            className="absolute inset-x-0 top-[calc(100%+6px)] z-20 flex flex-col rounded-[4px] bg-white p-2.5 outline-none"
          >
            {options.map((o, i) => {
              const isSelected = o.value === value;
              return (
                <li
                  key={o.value}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onPointerMove={() => setActive(i)}
                  onClick={() => choose(i)}
                  className={`flex h-10 cursor-pointer items-center justify-between gap-1 rounded-[4px] px-3 text-subtitle-2s ${
                    isSelected ? "text-brand-950" : "text-gray-700"
                  } ${i === active ? "bg-gray-50" : "bg-white"}`}
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
