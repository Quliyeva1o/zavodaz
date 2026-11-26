import { FACTORY_TYPES, type FactoryType } from "../features/catalog/types";
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
  factory: { az: "fabrik", en: "factory", ru: "fabrika" },
} as const satisfies Record<string, Localized>;

export type RouteKey = keyof typeof staticRoutes;

/** Public segment of each factory type's catalog page (`/zavodlar`, `/en/plants`, ...). */
export const typeRoutes: Record<FactoryType, Localized> = {
  zavod: { az: "zavodlar", en: "plants", ru: "zavody" },
  fabrik: { az: "fabrikler", en: "factories", ru: "fabriki" },
  sex: { az: "sexler", en: "workshops", ru: "cekhi" },
  emalatxana: { az: "emalatxanalar", en: "ateliers", ru: "masterskie" },
  kombinat: { az: "kombinatlar", en: "complexes", ru: "kombinaty" },
  aqropark: { az: "aqroparklar", en: "agroparks", ru: "agroparki" },
};

/** The "Recommended" sub-page of the catalog. */
export const CATALOG_RECOMMENDED: Localized = { az: "tovsiyye-edilenler", en: "recommended", ru: "rekomenduemye" };

// Reverse lookups, built once at module load (resolvePublicPath runs on every request).
const routeByLocale = Object.fromEntries(
  locales.map((l) => [
    l,
    new Map((Object.keys(staticRoutes) as RouteKey[]).filter((k) => k !== "home").map((k) => [staticRoutes[k][l], k])),
  ]),
) as Record<Locale, Map<string, RouteKey>>;

const typeByLocale = Object.fromEntries(
  locales.map((l) => [l, new Map(FACTORY_TYPES.map((t) => [typeRoutes[t][l], t]))]),
) as Record<Locale, Map<string, FactoryType>>;

for (const l of locales) {
  const taken = new Set<string>([...routeByLocale[l].keys(), CATALOG_RECOMMENDED[l]]);
  for (const t of FACTORY_TYPES) {
    if (taken.has(typeRoutes[t][l])) throw new Error(`URL segment clash in ${l}: ${typeRoutes[t][l]}`);
    taken.add(typeRoutes[t][l]);
  }
}

/** Public URL of a page (plus optional extra segments) in a language. */
export function href(route: RouteKey, locale: Locale, ...rest: string[]): string {
  const parts = [locale === defaultLocale ? "" : locale, staticRoutes[route][locale], ...rest].filter(Boolean);
  return "/" + parts.join("/");
}

const CABINET_SECTIONS = { tariffs: { az: "tarifler", en: "pricing", ru: "tarify" } } as const satisfies Record<string, Localized>;

/** Cabinet sub-page URL (pages themselves arrive in step 7). */
export function cabinetPath(section: keyof typeof CABINET_SECTIONS, lang: Locale): string {
  return href("cabinet", lang, CABINET_SECTIONS[section][lang]);
}

/** Factory type page (optionally a landing: type + city/sector/...). Landing slugs are language-neutral. */
export function typeHref(type: FactoryType, lang: Locale, landing?: string): string {
  return "/" + [lang === defaultLocale ? "" : lang, typeRoutes[type][lang], landing].filter(Boolean).join("/");
}

export function recommendedHref(lang: Locale): string {
  return href("catalog", lang, CATALOG_RECOMMENDED[lang]);
}

/** Factory page tabs; the key is the internal segment (`/[lang]/factory/<slug>/<key>`). "about" is the factory URL itself. */
export const FACTORY_TABS = ["about", "media", "products", "capabilities", "vacancies"] as const;
export type FactoryTab = (typeof FACTORY_TABS)[number];
type SubTab = Exclude<FactoryTab, "about">;

/** Public tab segment per language (controller URL table, step 3). */
export const factoryTabSegments: Record<SubTab, Localized> = {
  media: { az: "media", en: "media", ru: "media" },
  products: { az: "mehsullar", en: "products", ru: "produkciya" },
  capabilities: { az: "texniki-imkanlar", en: "capabilities", ru: "vozmozhnosti" },
  vacancies: { az: "vakansiyalar", en: "vacancies", ru: "vakansii" },
};

const tabByLocale = Object.fromEntries(
  locales.map((l) => [l, new Map((Object.keys(factoryTabSegments) as SubTab[]).map((t) => [factoryTabSegments[t][l], t]))]),
) as Record<Locale, Map<string, SubTab>>;

/** Factory page, or one of its tabs. Without `tab` (or "about") it is the URL the catalog cards link to. */
export function factoryHref(slug: string, lang: Locale, tab?: FactoryTab): string {
  return tab && tab !== "about" ? href("factory", lang, slug, factoryTabSegments[tab][lang]) : href("factory", lang, slug);
}

/** `<code>-<slug>`: the 7-digit code (products.id) is the key, the slug part is cosmetic. */
export const productSegment = (product: { id: number; slug: string }): string => (product.slug ? `${product.id}-${product.slug}` : String(product.id));

export function productHref(factorySlug: string, product: { id: number; slug: string }, lang: Locale): string {
  return factoryHref(factorySlug, lang, "products") + "/" + productSegment(product);
}

const PRODUCT_SEGMENT = /^([1-9][0-9]{0,14})(?:-[a-z0-9]+(?:-[a-z0-9]+)*)?$/;

/** Product code from a `<code>-<slug>` URL segment; null when the segment has no valid code. */
export function productKey(segment: string): number | null {
  const m = PRODUCT_SEGMENT.exec(segment);
  if (!m) return null;
  const code = Number(m[1]);
  return Number.isSafeInteger(code) ? code : null;
}

/** `<slug>[/<tab>[/<code-slug>]]` after the factory segment → internal rest, or null (404). */
function resolveFactoryRest(locale: Locale, rest: string[]): string[] | null {
  const [slug, tabSegment, product, ...extra] = rest;
  if (!slug || extra.length > 0) return null;
  if (tabSegment === undefined) return [slug];
  const tab = tabByLocale[locale].get(tabSegment);
  if (!tab) return null;
  if (product === undefined) return [slug, tab];
  return tab === "products" && productKey(product) !== null ? [slug, tab, product] : null;
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

  const type = typeByLocale[locale].get(first);
  if (type) {
    if (rest.length > 1) return { kind: "notFound", locale };
    return { kind: "rewrite", internal: ["", locale, "catalog", "type", type, ...rest].join("/") };
  }

  const route = routeByLocale[locale].get(first);
  if (!route) return { kind: "notFound", locale };
  if (route === "catalog" && rest.length) {
    if (rest.length === 1 && rest[0] === CATALOG_RECOMMENDED[locale]) {
      return { kind: "rewrite", internal: `/${locale}/catalog/recommended` };
    }
    return { kind: "notFound", locale };
  }
  if (route === "factory") {
    const internal = resolveFactoryRest(locale, rest);
    return internal ? { kind: "rewrite", internal: ["", locale, "factory", ...internal].join("/") } : { kind: "notFound", locale };
  }
  return { kind: "rewrite", internal: ["", locale, route, ...rest].join("/") };
}

/** Same page in another language (used by the language switcher at click time). */
export function switchLocalePath(pathname: string, target: Locale): string {
  const resolved = resolvePublicPath(pathname);
  if (resolved.kind !== "rewrite") return href("home", target);
  const [, , route, ...rest] = resolved.internal.split("/");
  if (!route) return href("home", target);
  if (route === "catalog") {
    if (rest[0] === "recommended") return recommendedHref(target);
    if (rest[0] === "type" && rest[1]) return typeHref(rest[1] as FactoryType, target, rest[2]);
  }
  if (route === "factory") {
    const [slug, tab, product] = rest as [string, FactoryTab | undefined, string | undefined];
    const page = factoryHref(slug, target, tab);
    return product ? `${page}/${product}` : page;
  }
  return href(route as RouteKey, target, ...rest);
}
