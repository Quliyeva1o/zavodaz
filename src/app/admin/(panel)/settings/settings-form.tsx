"use client";

import { useActionState } from "react";
import { locales } from "@/i18n/config";
import { SOCIALS, type SiteSettings } from "@/features/settings/schema";
import { saveSettings } from "./actions";

const input = "h-10 w-full rounded-[4px] border border-gray-200 bg-white px-3 text-body-md focus:border-brand-700 focus:outline-none";
const LANG_LABEL = { az: "AZ", en: "EN", ru: "RU" } as const;

function Field({ label, name, value, error }: { label: string; name: string; value: string; error?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-body-sm">
      {label}
      <input name={name} defaultValue={value} aria-invalid={!!error} className={input} />
      {error && <span className="text-caption text-red-700">{error}</span>}
    </label>
  );
}

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, action, pending] = useActionState(saveSettings, undefined);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="flex max-w-3xl flex-col gap-8">
      <section className="grid grid-cols-2 gap-4 rounded-[10px] bg-white p-6">
        <h2 className="col-span-2 text-subtitle-2s-semibold">Əlaqə</h2>
        <Field label="Telefon" name="phone" value={settings.phone} error={e.phone} />
        <Field label="İkinci telefon (footer)" name="phone2" value={settings.phone2} error={e.phone2} />
        <Field label="WhatsApp nömrəsi" name="whatsapp" value={settings.whatsapp} error={e.whatsapp} />
        <Field label="E-mail" name="email" value={settings.email} error={e.email} />
      </section>
      <section className="grid grid-cols-3 gap-4 rounded-[10px] bg-white p-6">
        <h2 className="col-span-3 text-subtitle-2s-semibold">Ünvan və © mətni</h2>
        {locales.map((l) => (
          <Field key={`a-${l}`} label={`Ünvan (${LANG_LABEL[l]})`} name={`address.${l}`} value={settings.address[l]} error={e[`address.${l}`]} />
        ))}
        {locales.map((l) => (
          <Field key={`c-${l}`} label={`© mətni (${LANG_LABEL[l]})`} name={`copyright.${l}`} value={settings.copyright[l]} error={e[`copyright.${l}`]} />
        ))}
      </section>
      <section className="grid grid-cols-2 gap-4 rounded-[10px] bg-white p-6">
        <h2 className="col-span-2 text-subtitle-2s-semibold">Sosial şəbəkələr (boş qalan footer-də görünmür)</h2>
        {SOCIALS.map((s) => (
          <Field key={s} label={s} name={`socials.${s}`} value={settings.socials[s]} error={e[`socials.${s}`]} />
        ))}
      </section>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="h-10 rounded-[4px] bg-brand-950 px-6 text-body-md text-white disabled:opacity-60">
          Yadda saxla
        </button>
        {state?.ok && <p role="status" className="text-body-sm text-green-600">Yadda saxlanıldı</p>}
        {state?.errors && <p role="alert" className="text-body-sm text-red-700">Xətaları düzəldin</p>}
      </div>
    </form>
  );
}
