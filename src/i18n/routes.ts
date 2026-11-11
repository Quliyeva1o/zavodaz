import { defaultLocale, hasLocale, locales, type Locale, type Localized } from "./config";

/**
 * Pages with a fixed URL. The key is the internal folder under `app/[lang]/`, the value is
 * the public segment per language (spec 5). Dynamic segments (factory types, slugs) are
 * added in their own steps.
 */
export const staticRoutes = {
  home: { az: "", en: "", ru: "" },
  catalog: { az: "kataloq", en: "catalog", ru: "katalog" },
  news: { az: "xeberler", en: "news", ru: "novosti" },
  vacancies: { az: "vakansiyalar", en: "vacancies", ru: "vakansii" },
  tariffs: { az: "tarifler", en: "pricing", ru: "tarify" },
  contact: { az: "elaqe", en: "contact", ru: "kontakty" },
  help: { az: "yardim", en: "help", ru: "pomoshch" },
  terms: { az: "istifadeci-qaydalari", en: "terms-of-use", ru: "pravila" },
  privacy: { az: "mexfilik-siyaseti", en: "privacy-policy", ru: "konfidencialnost" },
  search: { az: "axtaris", en: "search", ru: "poisk" },
  login: { az: "daxil-ol", en: "login", ru: "vhod" },
  register: { az: "qeydiyyat", en: "register", ru: "registraciya" },
  cabinet: { az: "kabinet", en: "cabinet", ru: "lichnyj-kabinet" },
} as const satisfies Record<string, Localized>;

export type RouteKey = keyof typeof staticRoutes;

/** Public URL of a page (plus optional extra segments) in a language. */
export function href(route: RouteKey, locale: Locale, ...rest: string[]): string {
  const parts = [locale === defaultLocale ? "" : locale, staticRoutes[route][locale], ...rest].filter(Boolean);
  return "/" + parts.join("/");
}

/** One page in every language — for hreflang. */
export function alternates(route: RouteKey): Localized {
  return Object.fromEntries(locales.map((l) => [l, href(route, l)])) as Localized;
}

export type ResolvedPath =
  | { kind: "rewrite"; internal: string }
  | { kind: "redirect"; to: string }
  | { kind: "notFound"; locale: Locale };

/**
 * Public pathname → internal `/[lang]/<route>/...`. Only the segment of the matching
 * language is accepted, so every page has exactly one URL per language (SEO).
 */
export function resolvePublicPath(pathname: string): ResolvedPath {
  const segments = pathname.split("/").filter(Boolean);
  let locale: Locale = defaultLocale;

  if (segments[0] && hasLocale(segments[0])) {
    if (segments[0] === defaultLocale) return { kind: "redirect", to: "/" + segments.slice(1).join("/") };
    locale = segments.shift() as Locale;
  }

  const [first, ...rest] = segments;
  if (!first) return { kind: "rewrite", internal: `/${locale}` };

  const route = (Object.keys(staticRoutes) as RouteKey[]).find(
    (key) => key !== "home" && staticRoutes[key][locale] === first,
  );
  if (!route) return { kind: "notFound", locale };
  return { kind: "rewrite", internal: ["", locale, route, ...rest].join("/") };
}

/** Same page in another language (used by the language switcher at click time). */
export function switchLocalePath(pathname: string, target: Locale): string {
  const resolved = resolvePublicPath(pathname);
  if (resolved.kind !== "rewrite") return href("home", target);
  const [, , route, ...rest] = resolved.internal.split("/");
  if (!route) return href("home", target);
  return href(route as RouteKey, target, ...rest);
}
