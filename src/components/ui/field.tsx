import { Icon } from "./icon";

/**
 * Form field parts, Figma "Frame 11" input set (52:2198). Shared by Field, TextareaField and SelectField.
 * Box: 40 high, radius 4, 1px gray-200 stroke inside, padding 10/12 (11 here: the CSS border takes 1px).
 * States: Default bg white, text gray-500 (placeholder) · Hover 52:2261 bg gray-50 · Typing 52:2247 border
 * brand-950 · Filled 52:2235 text brand-950 · Error 52:2223 border + text red-700 · Disabled 52:2211 text gray-700.
 * The "Caption text here" row is hidden in every contact form instance (153:4667…), so it takes no space
 * unless there is an error (field height 67 = label 21 + 6 + box 40).
 */
export const fieldBox =
  "w-full rounded-[4px] border border-gray-200 bg-white px-[11px] text-brand-950 outline-none placeholder:text-gray-500 hover:bg-gray-50 focus:border-brand-950 focus-visible:border-brand-950 disabled:text-gray-700 aria-invalid:border-red-700 aria-invalid:text-red-700 aria-invalid:placeholder:text-red-700";

/** Label row (52:2200): Subtitle 2/Regular 16/20.8, brand-950; the red asterisk (52:2202) is hidden in the contact form. */
export function FieldLabel({ id, htmlFor, label, requiredMark }: { id?: string; htmlFor: string; label: string; requiredMark?: boolean }) {
  return (
    <label id={id} htmlFor={htmlFor} className="flex gap-1 text-subtitle-2s text-brand-950">
      {label}
      {requiredMark && (
        <span aria-hidden className="text-red-700">
          *
        </span>
      )}
    </label>
  );
}

/** Error caption (52:2232): WarningCircle 16 + Caption 12/16.8, red-700, gap 4. */
export function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="flex items-center gap-1 text-caption-tight text-red-700">
      <Icon name="warning-circle" size={16} className="shrink-0" />
      {message}
    </p>
  );
}

type FieldProps = {
  name: string;
  label: string;
  required?: boolean;
  /** Shows the red asterisk (hidden in the Figma contact form). */
  requiredMark?: boolean;
  type?: "text" | "email" | "tel";
  placeholder?: string;
  defaultValue?: string;
  /** Already translated text. */
  error?: string;
  autoComplete?: string;
  maxLength?: number;
};

/** Text input (server-safe, no JS). Value text: Body Text/Medium 16/24 -0.16. */
export function Field({ name, label, required, requiredMark, type = "text", placeholder, defaultValue, error, autoComplete, maxLength }: FieldProps) {
  const id = `f-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id} label={label} requiredMark={requiredMark} />
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`h-10 text-body-md ${fieldBox}`}
      />
      {error && <FieldError id={`${id}-err`} message={error} />}
    </div>
  );
}
