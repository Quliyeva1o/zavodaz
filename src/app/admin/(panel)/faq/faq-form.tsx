"use client";

import { useActionState, useState, useTransition } from "react";
import { locales, type Locale, type Localized } from "@/i18n/config";
import { LangTabs } from "../../_components/lang-tabs";
import { deleteFaqItem, moveFaqItem, saveFaqItem, toggleFaqItem, type FaqSaveState } from "./actions";

type Item = { id: string; question: Localized; answer: Localized; published: boolean };

const input = "h-10 w-full rounded-[4px] border border-gray-200 bg-white px-3 text-body-md focus:border-brand-700 focus:outline-none";
const textarea = "w-full rounded-[4px] border border-gray-200 bg-white px-3 py-2 text-body-md focus:border-brand-700 focus:outline-none";
const LANG_LABEL: Record<Locale, string> = { az: "AZ", en: "EN", ru: "RU" };
const small = "h-9 min-w-9 rounded-[4px] px-2.5 text-body-sm hover:bg-gray-100 disabled:opacity-40";

const BLANK: Item = { id: "", question: { az: "", en: "", ru: "" }, answer: { az: "", en: "", ru: "" }, published: true };

function ItemForm({ item, onDone, onCancel }: { item: Item; onDone: () => void; onCancel: () => void }) {
  const [question, setQuestion] = useState<Localized>(item.question);
  const [answer, setAnswer] = useState<Localized>(item.answer);
  const [state, action, pending] = useActionState(async (prev: FaqSaveState, form: FormData) => {
    const result = await saveFaqItem(prev, form);
    if (result?.ok) onDone();
    return result;
  }, undefined);

  const empty = Object.fromEntries(locales.map((l) => [l, !question[l].trim() || !answer[l].trim()])) as Record<Locale, boolean>;

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-4 rounded-[10px] bg-white p-6">
      <h2 className="text-subtitle-2s-semibold">{item.id ? "Sualı redaktə et" : "Yeni sual"}</h2>
      {item.id && <input type="hidden" name="id" value={item.id} />}
      <LangTabs empty={{ en: empty.en, ru: empty.ru }}>
        {(l) => (
          <>
            <label className="flex flex-col gap-1.5 text-body-sm">
              Sual ({LANG_LABEL[l]})
              <input name={`question.${l}`} value={question[l]} onChange={(e) => setQuestion((p) => ({ ...p, [l]: e.target.value }))} maxLength={300} className={input} />
            </label>
            <label className="flex flex-col gap-1.5 text-body-sm">
              Cavab ({LANG_LABEL[l]})
              <textarea name={`answer.${l}`} value={answer[l]} onChange={(e) => setAnswer((p) => ({ ...p, [l]: e.target.value }))} maxLength={3000} rows={5} className={textarea} />
            </label>
          </>
        )}
      </LangTabs>
      <label className="flex items-center gap-2 text-body-sm">
        <input type="checkbox" name="published" defaultChecked={item.published} className="size-4" />
        Saytda göstər
      </label>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="h-10 rounded-[4px] bg-brand-950 px-6 text-body-md text-white disabled:opacity-60">
          Yadda saxla
        </button>
        <button type="button" onClick={onCancel} className="h-10 rounded-[4px] px-4 text-body-md hover:bg-gray-100">
          Ləğv et
        </button>
        {state?.error && <p role="alert" className="text-body-sm text-red-700">{state.error}</p>}
      </div>
    </form>
  );
}

export function FaqAdmin({ items }: { items: Item[] }) {
  const [editing, setEditing] = useState<Item | null>(null);
  const [confirming, setConfirming] = useState<Item | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<void>) => startTransition(() => void fn());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => {
            setSaved(false);
            setEditing(BLANK);
          }}
          className="h-10 rounded-[4px] bg-brand-950 px-6 text-body-md text-white"
        >
          Yeni sual
        </button>
        {saved && <p role="status" className="text-body-sm text-green-600">Yadda saxlanıldı</p>}
      </div>

      {editing && (
        <ItemForm
          key={editing.id || "new"}
          item={editing}
          onDone={() => {
            setEditing(null);
            setSaved(true);
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      <table className="w-full max-w-4xl overflow-hidden rounded-[10px] bg-white text-left text-body-md">
        <thead className="bg-gray-50 text-body-sm text-gray-500">
          <tr>
            <th className="px-4 py-3 font-normal">Sual (AZ)</th>
            <th className="px-4 py-3 font-normal">Status</th>
            <th className="px-4 py-3 font-normal">Sıra</th>
            <th className="px-4 py-3 font-normal">Əməliyyatlar</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-gray-500">Hələ sual yoxdur.</td>
            </tr>
          )}
          {items.map((item, i) => (
            <tr key={item.id} className="border-t border-gray-100">
              <td className="px-4 py-3">{item.question.az}</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  disabled={pending}
                  aria-pressed={item.published}
                  onClick={() => run(() => toggleFaqItem(item.id))}
                  className={`${small} ${item.published ? "text-green-600" : "text-gray-500"}`}
                >
                  {item.published ? "Göstərilir" : "Gizlidir"}
                </button>
              </td>
              <td className="px-4 py-3">
                <button type="button" aria-label="Yuxarı" disabled={pending || i === 0} onClick={() => run(() => moveFaqItem(item.id, "up"))} className={small}>
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Aşağı"
                  disabled={pending || i === items.length - 1}
                  onClick={() => run(() => moveFaqItem(item.id, "down"))}
                  className={small}
                >
                  ↓
                </button>
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setSaved(false);
                    setEditing(item);
                  }}
                  className={small}
                >
                  Redaktə
                </button>
                <button type="button" onClick={() => setConfirming(item)} className={`${small} text-red-700`}>
                  Sil
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="faq-confirm" className="flex w-full max-w-md flex-col gap-4 rounded-[10px] bg-white p-6">
            <h2 id="faq-confirm" className="text-subtitle-2s-semibold">Sual silinsin?</h2>
            <p className="text-body-md text-gray-700">“{confirming.question.az}” həmişəlik silinəcək. Geri qaytarmaq mümkün deyil.</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setConfirming(null)} className="h-10 rounded-[4px] px-4 text-body-md hover:bg-gray-100">
                Ləğv et
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = confirming.id;
                  setConfirming(null);
                  run(() => deleteFaqItem(id));
                }}
                className="h-10 rounded-[4px] bg-red-700 px-4 text-body-md text-white"
              >
                Bəli, sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
