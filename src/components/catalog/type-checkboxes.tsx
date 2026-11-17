import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import type { FactoryType } from "@/features/catalog/types";
import { Icon } from "@/components/ui/icon";

/**
 * One option box of the catalog filter, Figma "Frame 26085799" (281:7008 checked, 281:7427 unchecked):
 * 303×55, padding 16 (15 + the 1px CSS border), r6, gap 6; stroke gray-200, checked brand-950.
 * "Controls" 22×22 holds an 18×18 box (r3.54, 1.14 stroke gray-200 / brand-950 + brand-500 check, 280:6802).
 * Text 16/21.6 −0.16 (no Figma text style): gray-500, checked gray-700.
 * A native input (checkbox or radio) carries the value (works without JS); it is transparent and covers the
 * whole box, so the box is its click target.
 */
export function ChoiceBox({
  id,
  type,
  name,
  value,
  label,
  checked,
  allOf,
}: {
  id: string;
  type: "checkbox" | "radio";
  name?: string;
  value: string;
  label: string;
  checked: boolean;
  /** "Hamısı" checkbox of the group `allOf`: no name (never in the URL), AutoSubmit clears the group. */
  allOf?: string;
}) {
  return (
    <label
      htmlFor={id}
      className="group relative flex h-[55px] cursor-pointer items-center gap-1.5 rounded-[6px] border border-gray-200 bg-white px-[15px] text-gray-500 hover:bg-gray-50 has-checked:border-brand-950 has-checked:text-gray-700 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-500"
    >
      <input id={id} type={type} name={name} value={value} defaultChecked={checked} data-all={allOf} className="absolute inset-0 m-0 size-full cursor-pointer appearance-none rounded-[inherit] opacity-0" />
      <span aria-hidden className="flex size-[22px] shrink-0 items-center justify-center">
        <span className="flex size-[18px] items-center justify-center rounded-[3.54px] border-[1.14px] border-gray-200 group-has-checked:border-brand-950">
          <Icon name="check-brand" size={18} className="hidden max-w-none shrink-0 group-has-checked:block" />
        </span>
      </span>
      <span className="min-w-0 flex-1 truncate text-[16px] leading-[21.6px] tracking-[-0.16px]">{label}</span>
    </label>
  );
}

/** Figma order (281:7007): Hamısı, Zavod, Fabrik, Emalatxana, Sex, Kombinat, Aqropark. */
export const TYPE_ORDER: FactoryType[] = ["zavod", "fabrik", "emalatxana", "sex", "kombinat", "aqropark"];

/** "İstehsalın tipi" (281:7005): multi-select checkboxes `type=…`; "Hamısı" is checked when none is. */
export function TypeCheckboxes({ lang, selected }: { lang: Locale; selected: FactoryType[] }) {
  const t = dict(lang);
  return (
    <fieldset>
      <legend className="mb-4 min-h-[26px] text-subtitle-2-medium text-brand-950">{t.catalog.filters.type}</legend>
      <div className="flex flex-col gap-2.5">
        <ChoiceBox id="ft-all" type="checkbox" value="" label={t.catalog.all} checked={selected.length === 0} allOf="type" />
        {TYPE_ORDER.map((type) => (
          <ChoiceBox key={type} id={`ft-${type}`} type="checkbox" name="type" value={type} label={t.factoryType[type]} checked={selected.includes(type)} />
        ))}
      </div>
    </fieldset>
  );
}
