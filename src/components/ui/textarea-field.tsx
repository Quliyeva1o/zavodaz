"use client";

import { useState } from "react";
import { FieldError, FieldLabel, fieldBox } from "./field";
import { Icon } from "./icon";

type Props = {
  name: string;
  label: string;
  maxLength: number;
  required?: boolean;
  requiredMark?: boolean;
  placeholder?: string;
  defaultValue?: string;
  error?: string;
};

/**
 * Figma textarea "Frame 12" (52:2343; contact instance 153:4673): box 120 high, padding 10/12, text 16/20.8
 * (Subtitle 2/Regular); bottom row right-aligned: counter "0/200" (Label X Small 12/16, brand-950) + Notches 12, gap 4.
 * The text area leaves the counter row free (bottom padding 10 + 16 + gap 4, minus the 1px border).
 */
export function TextareaField({ name, label, maxLength, required, requiredMark, placeholder, defaultValue = "", error }: Props) {
  const id = `f-${name}`;
  const [count, setCount] = useState(defaultValue.length);
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id} label={label} requiredMark={requiredMark} />
      <div className="relative">
        <textarea
          id={id}
          name={name}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          defaultValue={defaultValue}
          onChange={(e) => setCount(e.currentTarget.value.length)}
          aria-invalid={!!error || undefined}
          aria-describedby={`${id}-count${error ? ` ${id}-err` : ""}`}
          className={`block h-[120px] resize-none pt-[9px] pb-[29px] text-subtitle-2s ${fieldBox}`}
        />
        <div className="pointer-events-none absolute right-3 bottom-2.5 flex items-end gap-1">
          <span id={`${id}-count`} className="text-label-xs text-brand-950">
            {`${count}/${maxLength}`}
          </span>
          <Icon name="notches" size={12} />
        </div>
      </div>
      {error && <FieldError id={`${id}-err`} message={error} />}
    </div>
  );
}
