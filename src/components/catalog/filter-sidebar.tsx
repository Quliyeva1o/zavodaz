import Form from "next/form";
import { pick, type Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { href } from "@/i18n/routes";
import type { CatalogFilter, CatalogScope, Dict, Dictionaries } from "@/features/catalog/types";
import { COOPERATION } from "@/features/catalog/types";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { AutoSubmit } from "./auto-submit";
import { ChoiceBox, TypeCheckboxes } from "./type-checkboxes";

type Props = {
  lang: Locale;
  scope: CatalogScope;
  filter: CatalogFilter;
  dicts: Dictionaries;
  /** Show "Filtri sıfırla" (the URL carries a filter). */
  filtered: boolean;
  /** Filterless list URL: the form action and the reset link. */
  basePath: string;
};

/**
 * Figma "Frame 26085812" (281:7004): 303 wide, groups 20 apart; "Filtr" H4 28/34.72 with "Filtri sıfırla"
 * (body-sm brand-500, bottom-aligned; only when filtered, as in 283:9156). Groups: heading 20/26 medium,
 * 16 to the control; type = checkboxes, coop and rating = radio boxes, the rest = Dropdown (SelectField).
 * A GET `next/form` (client-side navigation; on type/landing pages it submits to /kataloq with the type and landing as fields); AutoSubmit submits on change, `<noscript>` adds a button.
 * The form has no `page` field: any filter change starts again from page 1.
 * Mobile: hidden (the "Filtr" button opens MobileFilter); without JS the <noscript> link (#filtr) shows it via :target.
 */
export function FilterSidebar({ lang, scope, filter, dicts, filtered, basePath }: Props) {
  const t = dict(lang);
  const c = t.catalog;
  const options = (list: Dict[]) => [{ value: "", label: c.all }, ...list.map((d) => ({ value: d.slug, label: pick(d.name, lang) }))];
  const landing = scope.landing?.kind;
  // Type pages are not filterable by type: changing anything (the type first of all) continues on /kataloq, keeping the page scope.
  const leaves = Boolean(scope.types?.length);
  const radios = (heading: string, name: "coop" | "sort", current: string, items: { value: string; label: string }[]) => (
    <fieldset>
      <legend className="mb-4 min-h-[26px] text-subtitle-2-medium text-brand-950">{heading}</legend>
      <div className="flex flex-col gap-2.5">
        {[{ value: "", label: c.all }, ...items].map((o) => (
          <ChoiceBox key={o.value} id={`f${name}-${o.value || "all"}`} type="radio" name={name} value={o.value} label={o.label} checked={current === o.value} />
        ))}
      </div>
    </fieldset>
  );

  return (
    <aside id="filtr" aria-labelledby="filtr-title" className="flex-col gap-5 max-lg:hidden max-lg:target:flex lg:flex lg:w-[303px] lg:shrink-0">
      {/* Without JS the dropdowns are native <select>s (SelectField variant "filter"): hide the JS-only combobox boxes. */}
      <noscript>
        <style>{"[data-js-only]{display:none}"}</style>
      </noscript>
      <div className="flex min-h-[35px] items-end justify-between gap-5">
        <h2 id="filtr-title" className="text-h4 text-brand-950">
          {c.filter}
        </h2>
        {filtered && (
          <a href={basePath} className="relative text-body-sm text-brand-500 before:absolute before:inset-x-0 before:-inset-y-3 hover:underline">
            {c.reset}
          </a>
        )}
      </div>
      <Form action={leaves ? href("catalog", lang) : basePath} scroll={false} className="flex flex-col gap-5">
        <AutoSubmit />
        <TypeCheckboxes lang={lang} selected={filter.types} />
        {landing === "industry" && leaves && <input type="hidden" name="industry" value={scope.landing?.slug} />}
        {landing !== "industry" && (
          <SelectField variant="filter" name="industry" label={c.filters.industry} placeholder={c.all} options={options(dicts.industries)} defaultValue={filter.industry ?? ""} />
        )}
        {landing === "city" && leaves && <input type="hidden" name="city" value={scope.landing?.slug} />}
        {landing !== "city" && (
          <SelectField variant="filter" name="city" label={c.filters.city} placeholder={c.all} options={options(dicts.cities)} defaultValue={filter.city ?? ""} />
        )}
        <SelectField variant="filter" name="product" label={c.filters.product} placeholder={c.all} options={options(dicts.productTypes)} defaultValue={filter.product ?? ""} />
        <SelectField variant="filter" name="model" label={c.filters.model} placeholder={c.all} options={options(dicts.productionModels)} defaultValue={filter.model ?? ""} />
        {radios(c.filters.coop, "coop", filter.coop ?? "", COOPERATION.map((v) => ({ value: v, label: c.coop[v] })))}
        {radios(c.filters.sort, "sort", filter.sort === "default" ? "" : filter.sort, [
          { value: "rating_desc", label: c.sortHigh },
          { value: "rating_asc", label: c.sortLow },
        ])}
        <noscript>
          <Button type="submit" className="w-full">
            {c.apply}
          </Button>
        </noscript>
      </Form>
    </aside>
  );
}
