"use client";

import { useActionState, useId, useState, useTransition } from "react";
import type { Locale } from "@/i18n/config";
import { LangTabs } from "../../_components/lang-tabs";
import { deleteDictEntry, saveDictEntry, type DictState } from "./actions";

type Row = { id: number; slug: string; name: { az: string; en: string; ru: string }; sort: number; used: number };
type Raw = Record<"slug" | "name.az" | "name.en" | "name.ru" | "sort", string>;

const input = "h-10 w-full rounded-[4px] border border-gray-200 bg-white px-3 text-body-md focus:border-brand-700 focus:outline-none";
const LANG_LABEL: Record<Locale, string> = { az: "AZ", en: "EN", ru: "RU" };
const small = "h-9 min-w-9 rounded-[4px] px-2.5 text-body-sm hover:bg-gray-100 disabled:opacity-40";

const toRaw = (r: Pick<Row, "slug" | "name" | "sort">): Raw => ({
  slug: r.slug,
  "name.az": r.name.az,
  "name.en": r.name.en,
  "name.ru": r.name.ru,
  sort: String(r.sort),
});

/** label[for] + error linked by aria-describedby (a wrapping label would put the error into the field's name). */
function TextField({ label, name, value, onChange, error, numeric }: { label: string; name: string; value: string; onChange: (ev: React.ChangeEvent<HTMLInputElement>) => void; error?: string; numeric?: boolean }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5 text-body-sm">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        maxLength={80}
        inputMode={numeric ? "numeric" : undefined}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={input}
      />
      {error && <span id={`${id}-error`} className="text-caption text-red-700">{error}</span>}
    </div>
  );
}

function EntryForm({ kind, title, id, initial, onDone, onCancel }: { kind: string; title: string; id: number | null; initial: Raw; onDone: () => void; onCancel: () => void }) {
  const [state, action, pending] = useActionState(async (prev: DictState, form: FormData) => {
    const result = await saveDictEntry(prev, form);
    if (result?.ok) onDone();
    return result;
  }, undefined);
  // Controlled values: React resets an uncontrolled form after its action, which would drop what was typed.
  const [v, setV] = useState<Raw>(initial);
  const e = state?.errors ?? {};
  const set = (k: keyof Raw) => (ev: React.ChangeEvent<HTMLInputElement>) => setV((p) => ({ ...p, [k]: ev.target.value }));

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-4 rounded-[10px] bg-white p-6">
      <h2 className="text-subtitle-2s-semibold">{id === null ? `Yeni dəyər: ${title}` : `Redaktə: ${initial["name.az"]}`}</h2>
      <input type="hidden" name="kind" value={kind} />
      {id !== null && <input type="hidden" name="id" value={id} />}
      <LangTabs empty={{ en: !v["name.en"].trim(), ru: !v["name.ru"].trim() }}>
        {(l) => <TextField label={`Ad (${LANG_LABEL[l]})`} name={`name.${l}`} value={v[`name.${l}`]} onChange={set(`name.${l}`)} error={e[`name.${l}`]} />}
      </LangTabs>
      <div className="grid grid-cols-[1fr_160px] gap-4">
        <TextField label="Slug (boş qalsa AZ addan yaranır)" name="slug" value={v.slug} onChange={set("slug")} error={e.slug} />
        <TextField label="Sıra" name="sort" value={v.sort} onChange={set("sort")} error={e.sort} numeric />
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="h-10 rounded-[4px] bg-brand-950 px-6 text-body-md text-white disabled:opacity-60">
          Yadda saxla
        </button>
        <button type="button" onClick={onCancel} className="h-10 rounded-[4px] px-4 text-body-md hover:bg-gray-100">
          Ləğv et
        </button>
        {state?.errors && <p role="alert" className="text-body-sm text-red-700">Xətaları düzəldin</p>}
        {state?.error && <p role="alert" className="text-body-sm text-red-700">{state.error}</p>}
      </div>
    </form>
  );
}

export function DictAdmin({ kind, title, rows, nextSort }: { kind: string; title: string; rows: Row[]; nextSort: number }) {
  const [editing, setEditing] = useState<{ id: number | null; raw: Raw } | null>(null);
  const [confirming, setConfirming] = useState<Row | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = (row: Row) =>
    startTransition(async () => {
      const result = await deleteDictEntry(kind, row.id);
      setMessage(result.error ? { ok: false, text: result.error } : { ok: true, text: `“${row.name.az}” silindi` });
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setEditing({ id: null, raw: toRaw({ slug: "", name: { az: "", en: "", ru: "" }, sort: nextSort }) });
          }}
          className="h-10 rounded-[4px] bg-brand-950 px-6 text-body-md text-white"
        >
          Yeni dəyər
        </button>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={`text-body-sm ${message.ok ? "text-green-600" : "text-red-700"}`}>
            {message.text}
          </p>
        )}
      </div>

      {editing && (
        <EntryForm
          key={editing.id ?? "new"}
          kind={kind}
          title={title}
          id={editing.id}
          initial={editing.raw}
          onDone={() => {
            setEditing(null);
            setMessage({ ok: true, text: "Yadda saxlanıldı" });
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      <table className="w-full max-w-4xl overflow-hidden rounded-[10px] bg-white text-left text-body-md">
        <thead className="bg-gray-50 text-body-sm text-gray-500">
          <tr>
            <th className="px-4 py-3 font-normal">Ad (AZ)</th>
            <th className="px-4 py-3 font-normal">Slug</th>
            <th className="px-4 py-3 font-normal">Sıra</th>
            <th className="px-4 py-3 font-normal">Zavod sayı</th>
            <th className="px-4 py-3 font-normal">Əməliyyatlar</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-gray-500">Hələ dəyər yoxdur.</td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-gray-100">
              <td className="px-4 py-3">{row.name.az}</td>
              <td className="px-4 py-3 font-mono text-body-sm">{row.slug}</td>
              <td className="px-4 py-3">{row.sort}</td>
              <td className="px-4 py-3">{row.used}</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  aria-label={`Redaktə: ${row.name.az}`}
                  onClick={() => {
                    setMessage(null);
                    setEditing({ id: row.id, raw: toRaw(row) });
                  }}
                  className={small}
                >
                  Redaktə
                </button>
                <button type="button" aria-label={`Sil: ${row.name.az}`} disabled={pending} onClick={() => setConfirming(row)} className={`${small} text-red-700`}>
                  Sil
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="dict-confirm" className="flex w-full max-w-md flex-col gap-4 rounded-[10px] bg-white p-6">
            <h2 id="dict-confirm" className="text-subtitle-2s-semibold">Dəyər silinsin?</h2>
            <p className="text-body-md text-gray-700">“{confirming.name.az}” lüğətdən silinəcək. Geri qaytarmaq mümkün deyil.</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setConfirming(null)} className="h-10 rounded-[4px] px-4 text-body-md hover:bg-gray-100">
                Ləğv et
              </button>
              <button
                type="button"
                onClick={() => {
                  const row = confirming;
                  setConfirming(null);
                  remove(row);
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
