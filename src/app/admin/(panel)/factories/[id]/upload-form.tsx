"use client";

import { useActionState, useState } from "react";
import type { MediaKind } from "@/features/media/url";
import { UploadField } from "../upload-field";
import type { ContentState } from "./actions";

const input = "h-10 w-full rounded-[4px] border border-gray-200 bg-white px-3 text-body-md focus:border-brand-700 focus:outline-none";

/**
 * Adds one uploaded file (and an optional title) to a section: the file goes to POST /api/admin/media first,
 * the form then sends only the media id. Forgets the upload after a successful add.
 */
export function UploadForm({
  action,
  hidden,
  kind,
  fileLabel,
  titleLabel,
  submitLabel,
  previewAlt,
}: {
  action: (prev: ContentState, form: FormData) => Promise<ContentState>;
  hidden: Record<string, string>;
  kind: MediaKind;
  fileLabel: string;
  titleLabel?: string;
  submitLabel: string;
  previewAlt?: string;
}) {
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState(false);
  // Controlled: React resets uncontrolled fields after every form action, which would drop the title on an error.
  const [title, setTitle] = useState("");
  const [state, formAction, pending] = useActionState(async (prev: ContentState, form: FormData): Promise<ContentState> => {
    const result = await action(prev, form);
    if (result?.ok) {
      setRound((n) => n + 1);
      setTitle("");
    }
    return result;
  }, undefined);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4 rounded-[10px] bg-white p-6">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {titleLabel && (
        <div className="flex flex-col gap-1.5 text-body-sm">
          <label htmlFor={`title-${kind}`}>{titleLabel}</label>
          <input id={`title-${kind}`} name="title" value={title} onChange={(ev) => setTitle(ev.target.value)} maxLength={120} aria-invalid={!!state?.errors?.title} className={input} />
          {state?.errors?.title && <span className="text-caption text-red-700">{state.errors.title}</span>}
        </div>
      )}
      <UploadField key={round} label={fileLabel} kind={kind} name="mediaId" error={state?.errors?.file} onBusyChange={setBusy} previewAlt={previewAlt} />
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending || busy} className="h-10 rounded-[4px] bg-brand-950 px-6 text-body-md text-white disabled:opacity-60">
          {submitLabel}
        </button>
        {state?.ok && !pending && <p role="status" className="text-body-sm text-green-600">Əlavə olundu</p>}
        {state?.error && <p role="alert" className="text-body-sm text-red-700">{state.error}</p>}
      </div>
    </form>
  );
}
