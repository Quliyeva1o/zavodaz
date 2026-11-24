"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ALLOWED_TYPES, MAX_PDF_BYTES, MAX_UPLOAD_BYTES, mediaSrc, type MediaKind } from "@/features/media/url";

const MESSAGES: Record<string, string> = {
  type: "Fayl növü uyğun deyil",
  size: "Fayl çox böyükdür",
  decode: "Fayl oxunmadı",
  auth: "Sessiya bitib, yenidən daxil olun",
};

export type Uploaded = { id: string; variants?: number[]; size?: number };
type State = { status: "idle" } | { status: "uploading" } | { status: "done"; file: Uploaded } | { status: "error"; message: string };

const RULES: Record<MediaKind, { accept: string; max: number; types: readonly string[]; typeMessage: string; sizeMessage: string; hint: string }> = {
  image: {
    accept: "image/jpeg,image/png,image/webp",
    max: MAX_UPLOAD_BYTES,
    types: ALLOWED_TYPES,
    typeMessage: "Yalnız JPG, PNG və ya WebP",
    sizeMessage: "Fayl 8 MB-dan böyük ola bilməz",
    hint: "JPG, PNG və ya WebP, ən çox 8 MB",
  },
  pdf: {
    accept: "application/pdf",
    max: MAX_PDF_BYTES,
    types: ["application/pdf"],
    typeMessage: "Yalnız PDF faylı",
    sizeMessage: "Fayl 20 MB-dan böyük ola bilməz",
    hint: "PDF, ən çox 20 MB",
  },
};

/**
 * The file goes to POST /api/admin/media at once (R18); the form then submits only the returned media id in the
 * hidden field `name`. Remount it (key) to forget the upload after a save.
 */
export function UploadField({
  label,
  kind,
  name,
  error,
  onBusyChange,
  previewAlt = "Yeni şəkil",
}: {
  label: string;
  kind: MediaKind;
  name: string;
  error?: string;
  onBusyChange?: (busy: boolean) => void;
  previewAlt?: string;
}) {
  const id = useId();
  const rules = RULES[kind];
  const [state, setState] = useState<State>({ status: "idle" });
  const seq = useRef(0);
  const busy = state.status === "uploading";
  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);

  async function pick(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const mine = ++seq.current;
    if (!rules.types.includes(file.type)) return setState({ status: "error", message: rules.typeMessage });
    if (file.size > rules.max) return setState({ status: "error", message: rules.sizeMessage });
    setState({ status: "uploading" });
    let next: State;
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/admin/media?kind=${kind}`, { method: "POST", body });
      const data = (await res.json().catch(() => null)) as (Uploaded & { error?: string }) | null;
      next = res.ok && data?.id ? { status: "done", file: data } : { status: "error", message: MESSAGES[data?.error ?? ""] ?? "Fayl yüklənmədi" };
      if (!res.ok && data?.error === "type") next = { status: "error", message: rules.typeMessage };
      if (!res.ok && data?.error === "size") next = { status: "error", message: rules.sizeMessage };
      if (!res.ok && data?.error === "decode") next = { status: "error", message: kind === "image" ? "Şəkil oxunmadı" : "Fayl oxunmadı" };
    } catch {
      next = { status: "error", message: "Fayl yüklənmədi, bağlantını yoxlayın" };
    }
    if (mine === seq.current) setState(next); // a newer pick wins
  }

  const message = state.status === "error" ? state.message : error;
  return (
    <div className="flex flex-col gap-2 text-body-sm">
      <label htmlFor={id}>{`${label} (${rules.hint})`}</label>
      <input
        id={id}
        type="file"
        accept={rules.accept}
        disabled={busy}
        aria-invalid={!!message}
        onChange={(ev) => pick(ev.currentTarget)}
        className="text-body-sm"
      />
      {message && <span role="alert" className="text-caption text-red-700">{message}</span>}
      <p aria-live="polite" className="text-caption text-gray-500">
        {busy ? "Fayl yüklənir…" : state.status === "done" ? "Fayl yükləndi, yadda saxlayanda tətbiq olunacaq" : ""}
      </p>
      {state.status === "done" && (
        <>
          <input type="hidden" name={name} value={state.file.id} />
          {kind === "image" && state.file.variants && (
            // eslint-disable-next-line @next/next/no-img-element -- admin preview of an already resized variant
            <img src={mediaSrc({ id: state.file.id, variants: state.file.variants }, 320)} alt={previewAlt} width={160} className="rounded-[4px]" />
          )}
        </>
      )}
    </div>
  );
}
