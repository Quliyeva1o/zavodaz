"use client";

import { useActionState, useId, useRef, useState, type ReactNode } from "react";
import { SOCIALS } from "@/features/settings/links";
import { COOPERATION, FACTORY_TYPES } from "@/features/catalog/types";
import type { FactoryRaw } from "@/features/factories/admin";
import type { CoverRef, DictOptions } from "@/features/factories/admin-db";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, mediaSrc } from "@/features/media/url";
import { saveFactory, type FactoryState } from "./actions";
import { COOP_LABELS, SOCIAL_LABELS, STATUS_LABELS, TARIFF_LABELS, TYPE_LABELS } from "./labels";
import { UploadField } from "./upload-field";

const input = "h-10 w-full rounded-[4px] border border-gray-200 bg-white px-3 text-body-md focus:border-brand-700 focus:outline-none";
const textarea = "w-full rounded-[4px] border border-gray-200 bg-white px-3 py-2 text-body-md focus:border-brand-700 focus:outline-none";
const ABOUT_MAX = 400;

function Err({ id, text }: { id?: string; text?: string | null }) {
  return text ? <span id={id} className="text-caption text-red-700">{text}</span> : null;
}

type Control = { id: string; "aria-invalid": boolean; "aria-describedby"?: string };

/**
 * label[for] + error linked by aria-describedby. A wrapping <label> would put the error text (and a select's
 * selected option) into the field's accessible name.
 */
function Field({ label, aside, error, children }: { label: string; aside?: ReactNode; error?: string | null; children: (c: Control) => ReactNode }) {
  const id = useId();
  const errId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5 text-body-sm">
      <span className="flex justify-between gap-2">
        <label htmlFor={id}>{label}</label>
        {aside}
      </span>
      {children({ id, "aria-invalid": !!error, "aria-describedby": error ? errId : undefined })}
      <Err id={errId} text={error} />
    </div>
  );
}

function Select({ label, name, value, error, options, empty }: { label: string; name: string; value: string; error?: string; options: { value: string; label: string }[]; empty?: string }) {
  return (
    <Field label={label} error={error}>
      {(c) => (
        <select {...c} name={name} defaultValue={value} className={input}>
          {empty !== undefined && <option value="">{empty}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </Field>
  );
}

/** Uncontrolled fields; the form remounts them (key) after every save so they show what the server returned. */
function Fields({ v, e, options }: { v: FactoryRaw; e: Record<string, string>; options: DictOptions }) {
  const [aboutLength, setAboutLength] = useState(v.about.length);
  const opts = (list: { id: number; label: string }[]) => list.map((o) => ({ value: String(o.id), label: o.label }));

  return (
    <>
      <div className="grid grid-cols-[200px_1fr_1fr] gap-4">
        <Select label="Tip" name="type" value={v.type} error={e.type} options={FACTORY_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))} />
        <Field label="Ad" error={e.name}>
          {(c) => <input {...c} name="name" defaultValue={v.name} maxLength={120} className={input} />}
        </Field>
        <Field label="Slug (boş qalsa addan yaranır)" error={e.slug}>
          {(c) => <input {...c} name="slug" defaultValue={v.slug} maxLength={120} className={input} />}
        </Field>
      </div>

      <Field
        label="Haqqında"
        error={e.about}
        aside={
          <span className="text-gray-500">
            {aboutLength}/{ABOUT_MAX}
          </span>
        }
      >
        {(c) => <textarea {...c} name="about" defaultValue={v.about} maxLength={ABOUT_MAX} rows={4} onChange={(ev) => setAboutLength(ev.target.value.length)} className={textarea} />}
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Select label="Sahə" name="industryId" value={v.industryId} error={e.industryId} options={opts(options.industries)} empty="—" />
        <Select label="Məhsul tipi" name="productTypeId" value={v.productTypeId} error={e.productTypeId} options={opts(options.productTypes)} empty="—" />
        <Select label="Şəhər / Region" name="cityId" value={v.cityId} error={e.cityId} options={opts(options.cities)} empty="—" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <fieldset className="flex flex-col gap-2 text-body-sm">
          <legend className="mb-2">İstehsalat modeli</legend>
          {options.productionModels.map((m) => (
            <label key={m.id} className="flex items-center gap-2">
              <input type="checkbox" name="productionModelIds" value={m.id} defaultChecked={v.productionModelIds.includes(String(m.id))} className="size-4" />
              {m.label}
            </label>
          ))}
          <Err text={e.productionModelIds} />
        </fieldset>
        <fieldset className="flex flex-col gap-2 text-body-sm">
          <legend className="mb-2">Əməkdaşlıq imkanı</legend>
          {COOPERATION.map((c) => (
            <label key={c} className="flex items-center gap-2">
              <input type="checkbox" name="cooperation" value={c} defaultChecked={v.cooperation.includes(c)} className="size-4" />
              {COOP_LABELS[c]}
            </label>
          ))}
          <Err text={e.cooperation} />
        </fieldset>
      </div>

      <div className="grid grid-cols-4 items-start gap-4">
        <Select label="Status" name="status" value={v.status} error={e.status} options={(["draft", "published", "hidden"] as const).map((s) => ({ value: s, label: STATUS_LABELS[s] }))} />
        <Select label="Tarif" name="tariffCode" value={v.tariffCode} error={e.tariffCode} options={(["standart", "premium", "vip"] as const).map((t) => ({ value: t, label: TARIFF_LABELS[t] }))} />
        <Field label="Tarifin bitmə tarixi (boş = müddətsiz)" error={e.tariffUntil}>
          {(c) => <input {...c} type="date" name="tariffUntil" defaultValue={v.tariffUntil} className={input} />}
        </Field>
        <label className="mt-7 flex items-center gap-2 text-body-sm">
          <input type="checkbox" name="verified" defaultChecked={v.verified} className="size-4" />
          Təsdiqlənib
        </label>
      </div>

      <h2 className="text-h5 mt-2">Zavod səhifəsi</h2>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Hüquqi ad" error={e.legalName}>
          {(c) => <input {...c} name="legalName" defaultValue={v.legalName} maxLength={160} className={input} />}
        </Field>
        <Field label="İşçi sayı" error={e.employeeCount}>
          {(c) => <input {...c} type="number" name="employeeCount" defaultValue={v.employeeCount} min={1} max={1000000} className={input} />}
        </Field>
        <Field label="İstehsal gücü" error={e.capacityText}>
          {(c) => <input {...c} name="capacityText" defaultValue={v.capacityText} maxLength={200} className={input} />}
        </Field>
      </div>
      <Field label="Avadanlıq və texniki imkanlar" error={e.equipmentText}>
        {(c) => <textarea {...c} name="equipmentText" defaultValue={v.equipmentText} maxLength={4000} rows={5} className={textarea} />}
      </Field>

      <h2 className="text-h5 mt-2">Əlaqə</h2>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Telefon" error={e.phone}>
          {(c) => <input {...c} type="tel" name="phone" defaultValue={v.phone} maxLength={40} className={input} />}
        </Field>
        <Field label="E-poçt" error={e.email}>
          {(c) => <input {...c} type="email" name="email" defaultValue={v.email} maxLength={120} className={input} />}
        </Field>
        <Field label="Sayt" error={e.website}>
          {(c) => <input {...c} name="website" defaultValue={v.website} maxLength={200} placeholder="https://" className={input} />}
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Ünvan" error={e.address}>
          {(c) => <input {...c} name="address" defaultValue={v.address} maxLength={200} className={input} />}
        </Field>
        <Field label="YouTube linki" error={e.youtubeUrl}>
          {(c) => <input {...c} name="youtubeUrl" defaultValue={v.youtubeUrl} maxLength={200} placeholder="https://www.youtube.com/watch?v=" className={input} />}
        </Field>
      </div>

      <h2 className="text-h5 mt-2">Sosial şəbəkələr</h2>
      <div className="grid grid-cols-3 gap-4">
        {SOCIALS.map((k) => (
          <Field key={k} label={SOCIAL_LABELS[k]} error={e[`social_${k}`]}>
            {(c) => <input {...c} name={`social_${k}`} defaultValue={v.socials[k]} maxLength={200} placeholder="https://" className={input} />}
          </Field>
        ))}
      </div>
    </>
  );
}

const COVER_MESSAGES: Record<string, string> = {
  type: "Yalnız JPG, PNG və ya WebP",
  size: "Fayl 8 MB-dan böyük ola bilməz",
  decode: "Şəkil oxunmadı",
  auth: "Sessiya bitib, yenidən daxil olun",
};

type Upload = { status: "idle" } | { status: "uploading" } | { status: "done"; cover: CoverRef } | { status: "error"; message: string };

/** Cover: the file goes to POST /api/admin/media at once; the form then submits only the returned id (R18). */
function CoverField({ current, removeDefault, upload, serverError, onPick }: { current: CoverRef | null; removeDefault: boolean; upload: Upload; serverError?: string; onPick: (input: HTMLInputElement) => void }) {
  const error = upload.status === "error" ? upload.message : serverError;
  return (
    <div className="flex flex-col gap-2 text-body-sm">
      <Field label="Örtük şəkli (JPG, PNG və ya WebP, ən çox 8 MB)" error={error}>
        {(c) => <input {...c} type="file" accept="image/jpeg,image/png,image/webp" disabled={upload.status === "uploading"} onChange={(ev) => onPick(ev.currentTarget)} className="text-body-sm" />}
      </Field>
      <p aria-live="polite" className="text-caption text-gray-500">
        {upload.status === "uploading" ? "Şəkil yüklənir…" : upload.status === "done" ? "Şəkil yükləndi, yadda saxlayanda tətbiq olunacaq" : ""}
      </p>
      {upload.status === "done" ? (
        <>
          <input type="hidden" name="coverUploadId" value={upload.cover.id} />
          {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an already resized variant */}
          <img src={mediaSrc(upload.cover, 320)} alt="Yeni örtük şəkli" width={160} className="rounded-[4px]" />
        </>
      ) : (
        current && (
          <div className="flex items-end gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an already resized variant */}
            <img src={mediaSrc(current, 320)} alt="Mövcud örtük şəkli" width={160} className="rounded-[4px]" />
            <label className="flex items-center gap-2">
              <input type="checkbox" name="removeCover" defaultChecked={removeDefault} className="size-4" />
              Şəkli sil
            </label>
          </div>
        )
      )}
    </div>
  );
}

export function FactoryForm({ id, initial, cover, logo, options, saved }: { id: string | null; initial: FactoryRaw; cover: CoverRef | null; logo: CoverRef | null; options: DictOptions; saved: boolean }) {
  // Outside the remounted fields: an uploaded cover survives a failed save and is sent again with the next one.
  const [upload, setUpload] = useState<Upload>({ status: "idle" });
  const [logoKey, setLogoKey] = useState(0); // remounting the logo field forgets its upload
  const [logoBusy, setLogoBusy] = useState(false);
  const pickSeq = useRef(0);
  const [state, action, pending] = useActionState(async (prev: FactoryState, form: FormData): Promise<FactoryState> => {
    const result = await saveFactory(prev, form);
    if (result?.ok || result?.uploadDropped) setUpload({ status: "idle" });
    if (result?.ok || result?.logoDropped) setLogoKey((k) => k + 1);
    return { ...result, seq: (prev?.seq ?? 0) + 1 };
  }, undefined);
  const v = state?.values ?? initial;
  const currentCover = state?.cover !== undefined ? state.cover : cover;
  const currentLogo = state?.logo !== undefined ? state.logo : logo;
  const ok = state ? state.ok : saved;
  const errors = state?.errors ?? {};

  async function pick(inputEl: HTMLInputElement) {
    const file = inputEl.files?.[0];
    inputEl.value = "";
    if (!file) return;
    const seq = ++pickSeq.current;
    if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) return setUpload({ status: "error", message: COVER_MESSAGES.type });
    if (file.size > MAX_UPLOAD_BYTES) return setUpload({ status: "error", message: COVER_MESSAGES.size });
    setUpload({ status: "uploading" });
    let next: Upload;
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body });
      const data = (await res.json().catch(() => null)) as { id?: string; variants?: number[]; error?: string } | null;
      next =
        res.ok && data?.id && data.variants
          ? { status: "done", cover: { id: data.id, variants: data.variants } }
          : { status: "error", message: COVER_MESSAGES[data?.error ?? ""] ?? "Şəkil yüklənmədi" };
    } catch {
      next = { status: "error", message: "Şəkil yüklənmədi, bağlantını yoxlayın" };
    }
    if (seq === pickSeq.current) setUpload(next); // a newer pick wins
  }

  return (
    <form action={action} className="flex max-w-5xl flex-col gap-6 rounded-[10px] bg-white p-6">
      {id && <input type="hidden" name="id" value={id} />}
      <Fields key={state?.seq ?? 0} v={v} e={errors} options={options} />
      <CoverField key={`cover-${state?.seq ?? 0}`} current={currentCover} removeDefault={v.removeCover} upload={upload} serverError={errors.cover} onPick={pick} />
      <div className="flex flex-col gap-2">
        <UploadField key={logoKey} label="Loqo" kind="image" name="logoUploadId" error={errors.logo} onBusyChange={setLogoBusy} previewAlt="Yeni loqo" />
        {currentLogo && (
          <div key={`logo-${state?.seq ?? 0}`} className="flex items-end gap-4 text-body-sm">
            {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an already resized variant */}
            <img src={mediaSrc(currentLogo, 320)} alt="Mövcud loqo" width={160} className="rounded-[4px]" />
            <label className="flex items-center gap-2">
              <input type="checkbox" name="removeLogo" defaultChecked={v.removeLogo} className="size-4" />
              Loqonu sil
            </label>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending || upload.status === "uploading" || logoBusy} className="h-10 rounded-[4px] bg-brand-950 px-6 text-body-md text-white disabled:opacity-60">
          Yadda saxla
        </button>
        {id && v.status !== "hidden" && (
          <button
            type="submit"
            name="hide"
            value="1"
            disabled={pending || upload.status === "uploading" || logoBusy}
            className="h-10 rounded-[4px] border border-gray-200 px-6 text-body-md hover:bg-gray-100 disabled:opacity-60"
          >
            Gizlət
          </button>
        )}
        {ok && !pending && <p role="status" className="text-body-sm text-green-600">Yadda saxlanıldı</p>}
        {state?.errors && <p role="alert" className="text-body-sm text-red-700">Xətaları düzəldin</p>}
        {state?.error && <p role="alert" className="text-body-sm text-red-700">{state.error}</p>}
      </div>
    </form>
  );
}
