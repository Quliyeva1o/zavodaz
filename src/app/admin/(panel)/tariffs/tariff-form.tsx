"use client";

import { useActionState } from "react";
import { locales } from "@/i18n/config";
import { saveTariff } from "./actions";

type Raw = Record<string, string>;

const input = "h-10 w-full rounded-[4px] border border-gray-200 bg-white px-3 text-body-md focus:border-brand-700 focus:outline-none";
const textarea = "w-full rounded-[4px] border border-gray-200 bg-white px-3 py-2 text-body-md focus:border-brand-700 focus:outline-none";
const LANG: Record<string, string> = { az: "AZ", en: "EN", ru: "RU" };

function Field({ label, name, value, error, decimal }: { label: string; name: string; value: string; error?: string; decimal?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5 text-body-sm">
      {label}
      <input name={name} defaultValue={value} aria-invalid={!!error} inputMode={decimal ? "decimal" : undefined} className={input} />
      {error && <span className="text-caption text-red-700">{error}</span>}
    </label>
  );
}

export function TariffForm({ code, title, initial }: { code: string; title: string; initial: Raw }) {
  const [state, action, pending] = useActionState(saveTariff, undefined);
  const v = state?.values ?? initial;
  const e = state?.errors ?? {};
  return (
    <form action={action} className="flex max-w-4xl flex-col gap-5 rounded-[10px] bg-white p-6">
      <input type="hidden" name="code" value={code} />
      <h2 className="text-subtitle-2s-semibold">{title}</h2>
      <div className="grid grid-cols-3 gap-4">
        {locales.map((l) => (
          <Field key={l} label={`${title} — ad (${LANG[l]})`} name={`name.${l}`} value={v[`name.${l}`]} error={e[`name.${l}`]} />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4">
        <Field label={`${title} — aylıq qiymət (₼)`} name="priceMonth" value={v.priceMonth} error={e.priceMonth} decimal />
        <Field label={`${title} — illik qiymət (₼, boş = yoxdur)`} name="priceYear" value={v.priceYear} error={e.priceYear} decimal />
        <Field label={`${title} — məhsul limiti (boş = limitsiz)`} name="products" value={v.products} error={e.products} />
        <Field label={`${title} — vakansiya limiti (boş = limitsiz)`} name="vacancies" value={v.vacancies} error={e.vacancies} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {locales.map((l) => (
          <label key={l} className="flex flex-col gap-1.5 text-body-sm">
            {title} — xüsusiyyətlər ({LANG[l]}, hər sətir bir xüsusiyyət)
            <textarea name={`features.${l}`} defaultValue={v[`features.${l}`]} rows={6} aria-invalid={!!e[`features.${l}`]} className={textarea} />
            {e[`features.${l}`] && <span className="text-caption text-red-700">{e[`features.${l}`]}</span>}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="h-10 rounded-[4px] bg-brand-950 px-6 text-body-md text-white disabled:opacity-60">
          {title} — yadda saxla
        </button>
        {state?.ok && <p role="status" className="text-body-sm text-green-600">Yadda saxlanıldı</p>}
        {state?.errors && <p role="alert" className="text-body-sm text-red-700">Xətaları düzəldin</p>}
        {state?.error && <p role="alert" className="text-body-sm text-red-700">{state.error}</p>}
      </div>
    </form>
  );
}
