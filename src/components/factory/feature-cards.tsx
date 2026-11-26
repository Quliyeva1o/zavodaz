/**
 * The six "Haqqında" facts, Figma 331:10213 (desktop: 2 columns 16 apart, cards 100 high, pad 20 incl. the 1px stroke, r10, gray-200 stroke,
 * Subtitle 3 Medium title 12 above the body-md gray-700 value) / 764:23150 (mobile: one column 12 apart, pad 12, r6,
 * Mob Subtitle 2 title 6 above the body-sm value). Empty values read "-" (Figma).
 */
export function FeatureCards({ items }: { items: { key: string; label: string; value: string }[] }) {
  return (
    <dl data-figma="factory-features" className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
      {items.map((it) => (
        <div key={it.key} className="flex min-h-[71px] flex-col gap-1.5 rounded-md border border-gray-200 bg-white p-[11px] lg:min-h-[100px] lg:gap-3 lg:rounded-[10px] lg:p-[19px]">
          <dt className="text-mob-subtitle-2 leading-5 text-brand-950 lg:text-subtitle-3-medium lg:leading-6">{it.label}</dt>
          <dd className="text-body-sm text-gray-700 [overflow-wrap:anywhere] lg:text-body-md">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
