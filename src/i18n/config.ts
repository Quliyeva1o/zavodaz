export const locales = ["az", "en", "ru"] as const;
export type Locale = (typeof locales)[number];

/** AZ is served without a URL prefix (`/`), EN and RU under `/en` and `/ru`. */
export const defaultLocale: Locale = "az";

/** A value stored once per language — every admin-edited text uses this shape. */
export type Localized<T = string> = Record<Locale, T>;

export const hasLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);
