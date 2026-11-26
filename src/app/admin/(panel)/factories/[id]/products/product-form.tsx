"use client";

import { useActionState, useId, useState } from "react";
import { MAX_PRODUCT_DESCRIPTION, type ProductRaw } from "@/features/factory/content-admin";
import { STATUS_LABELS } from "../../labels";
import { saveProduct, type ContentState } from "../actions";

const input = "h-10 w-full rounded-[4px] border border-gray-200 bg-white px-3 text-body-md focus:border-brand-700 focus:outline-none";
const textarea = "w-full rounded-[4px] border border-gray-200 bg-white px-3 py-2 text-body-md focus:border-brand-700 focus:outline-none";

function Fields({ v, e }: { v: ProductRaw; e: Record<string, string> }) {
  const id = useId();
  const [length, setLength] = useState(v.description.length);
  const err = (k: string) => (e[k] ? <span id={`${id}-${k}`} className="text-caption text-red-700">{e[k]}</span> : null);
  const aria = (k: string) => ({ "aria-invalid": !!e[k], "aria-describedby": e[k] ? `${id}-${k}` : undefined });
  return (
    <>
      <div className="flex flex-col gap-1.5 text-body-sm">
        <label htmlFor={`${id}-name`}>Məhsulun adı</label>
        <input id={`${id}-name`} name="name" defaultValue={v.name} maxLength={120} {...aria("name")} className={input} />
        {err("name")}
      </div>
      <div className="flex flex-col gap-1.5 text-body-sm">
        <span className="flex justify-between gap-2">
          <label htmlFor={`${id}-description`}>Təsvir</label>
          <span className="text-gray-500">
            {length}/{MAX_PRODUCT_DESCRIPTION}
          </span>
        </span>
        <textarea
          id={`${id}-description`}
          name="description"
          defaultValue={v.description}
          maxLength={MAX_PRODUCT_DESCRIPTION}
          rows={5}
          onChange={(ev) => setLength(ev.target.value.length)}
          {...aria("description")}
          className={textarea}
        />
        {err("description")}
      </div>
      <div className="flex w-60 flex-col gap-1.5 text-body-sm">
        <label htmlFor={`${id}-status`}>Məhsulun statusu</label>
        <select id={`${id}-status`} name="status" defaultValue={v.status} {...aria("status")} className={input}>
          {(["draft", "published", "hidden"] as const).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {err("status")}
      </div>
    </>
  );
}

/** Create / edit form of a product. Values stay after an error; the fields remount (key) after each save. */
export function ProductForm({ factoryId, productId, initial, saved }: { factoryId: string; productId: number | null; initial: ProductRaw; saved: boolean }) {
  const [state, action, pending] = useActionState(async (prev: ContentState, form: FormData): Promise<ContentState> => {
    const result = await saveProduct(prev, form);
    return { ...result, seq: (prev?.seq ?? 0) + 1 };
  }, undefined);
  const v = state?.values ?? initial;
  const ok = state ? state.ok : saved;
  return (
    <form action={action} className="flex max-w-xl flex-col gap-4 rounded-[10px] bg-white p-6">
      <input type="hidden" name="factoryId" value={factoryId} />
      {productId !== null && <input type="hidden" name="productId" value={productId} />}
      <Fields key={state?.seq ?? 0} v={v} e={state?.errors ?? {}} />
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="h-10 rounded-[4px] bg-brand-950 px-6 text-body-md text-white disabled:opacity-60">
          Yadda saxla
        </button>
        {ok && !pending && <p role="status" className="text-body-sm text-green-600">Yadda saxlanıldı</p>}
        {state?.errors && <p role="alert" className="text-body-sm text-red-700">Xətaları düzəldin</p>}
        {state?.error && <p role="alert" className="text-body-sm text-red-700">{state.error}</p>}
      </div>
    </form>
  );
}
