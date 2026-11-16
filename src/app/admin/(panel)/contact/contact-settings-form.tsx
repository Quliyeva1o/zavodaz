"use client";

import { useActionState, useState } from "react";
import { locales, type Localized } from "@/i18n/config";
import { saveContactSettings } from "./actions";

type Topic = { id: string; label: Localized };
type Initial = { topics: Topic[]; notifyEmails: string };

const input = "h-10 w-full rounded-[4px] border border-gray-200 bg-white px-3 text-body-md focus:border-brand-700 focus:outline-none";
const small = "h-9 min-w-9 rounded-[4px] px-2.5 text-body-sm hover:bg-gray-100 disabled:opacity-40";
const LANG: Record<string, string> = { az: "AZ", en: "EN", ru: "RU" };

export function ContactSettingsForm({ initial }: { initial: Initial }) {
  const [state, action, pending] = useActionState(saveContactSettings, undefined);
  const [topics, setTopics] = useState<Topic[]>(initial.topics);
  const e = state?.errors ?? {};
  const emails = state?.values?.notifyEmails ?? initial.notifyEmails;

  const patch = (i: number, l: string, value: string) =>
    setTopics((p) => p.map((t, n) => (n === i ? { ...t, label: { ...t.label, [l]: value } } : t)));
  const move = (i: number, d: -1 | 1) =>
    setTopics((p) => {
      const next = [...p];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });

  return (
    <form action={action} className="flex max-w-4xl flex-col gap-8">
      <section className="flex flex-col gap-4 rounded-[10px] bg-white p-6">
        <h2 className="text-subtitle-2s-semibold">Mövzular (əlaqə formasındakı seçim)</h2>
        <input type="hidden" name="topics.count" value={topics.length} />
        {topics.map((t, i) => (
          <fieldset key={`${t.id}-${i}`} className="flex items-end gap-3">
            <legend className="sr-only">Mövzu {i + 1}</legend>
            <input type="hidden" name={`topics.${i}.id`} value={t.id} />
            {locales.map((l) => (
              <label key={l} className="flex flex-1 flex-col gap-1.5 text-body-sm">
                {`Mövzu ${i + 1} (${LANG[l]})`}
                <input
                  name={`topics.${i}.${l}`}
                  value={t.label[l]}
                  onChange={(ev) => patch(i, l, ev.target.value)}
                  maxLength={60}
                  aria-invalid={!!e[`topics.${i}.${l}`]}
                  className={input}
                />
                {e[`topics.${i}.${l}`] && <span className="text-caption text-red-700">{e[`topics.${i}.${l}`]}</span>}
              </label>
            ))}
            <div className="flex shrink-0 gap-1">
              <button type="button" aria-label={`Mövzu ${i + 1} — yuxarı`} disabled={i === 0} onClick={() => move(i, -1)} className={small}>
                ↑
              </button>
              <button type="button" aria-label={`Mövzu ${i + 1} — aşağı`} disabled={i === topics.length - 1} onClick={() => move(i, 1)} className={small}>
                ↓
              </button>
              <button
                type="button"
                aria-label={`Mövzu ${i + 1} — sil`}
                disabled={topics.length === 1}
                onClick={() => setTopics((p) => p.filter((_, n) => n !== i))}
                className={small}
              >
                Sil
              </button>
            </div>
          </fieldset>
        ))}
        {e.topics && <p role="alert" className="text-caption text-red-700">{e.topics}</p>}
        <button
          type="button"
          onClick={() => setTopics((p) => [...p, { id: "", label: { az: "", en: "", ru: "" } }])}
          disabled={topics.length >= 20}
          className="h-10 self-start rounded-[4px] border border-gray-200 px-4 text-body-md hover:bg-gray-100 disabled:opacity-40"
        >
          Mövzu əlavə et
        </button>
        <p className="text-caption text-gray-500">Boş EN/RU adı olan mövzu həmin dildə AZ adı ilə göstərilir.</p>
      </section>
      <section className="flex flex-col gap-3 rounded-[10px] bg-white p-6">
        <h2 className="text-subtitle-2s-semibold">Bildiriş</h2>
        <label className="flex flex-col gap-1.5 text-body-sm">
          Bildiriş e-mailləri
          <textarea
            name="notifyEmails"
            defaultValue={emails}
            rows={4}
            aria-invalid={!!e.notifyEmails}
            className="w-full rounded-[4px] border border-gray-200 bg-white px-3 py-2 text-body-md focus:border-brand-700 focus:outline-none"
          />
          <span className="text-caption text-gray-500">Vergül və ya yeni sətirlə ayırın. Boş qalsa, yeni müraciətlər üçün e-mail göndərilmir.</span>
          {e.notifyEmails && <span className="text-caption text-red-700">{e.notifyEmails}</span>}
        </label>
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
