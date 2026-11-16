"use client";

import { useActionState, useState } from "react";
import { locales, type Locale, type Localized } from "@/i18n/config";
import type { PageContent, RichDoc } from "@/features/pages/types";
import { LangTabs } from "../../../_components/lang-tabs";
import { RichTextEditor } from "../../../_components/rich-text-editor";
import { savePage } from "../actions";

const input = "h-10 w-full rounded-[4px] border border-gray-200 bg-white px-3 text-body-md focus:border-brand-700 focus:outline-none";
const textarea = "w-full rounded-[4px] border border-gray-200 bg-white px-3 py-2 text-body-md focus:border-brand-700 focus:outline-none";
const LANG_LABEL: Record<Locale, string> = { az: "AZ", en: "EN", ru: "RU" };
const SEO_DESCRIPTION_TARGET = 155;

/** Which fields each page has: intro only on tariffs / contact, a rich body only on the legal pages. */
const HAS_INTRO = new Set(["tariffs", "contact"]);
const HAS_BODY = new Set(["terms", "privacy"]);

export function PageForm({ page, defaultBody }: { page: PageContent; defaultBody: RichDoc | null }) {
  const [state, action, pending] = useActionState(savePage, undefined);
  const [title, setTitle] = useState<Localized>(page.title);
  const [intro, setIntro] = useState<Localized>(page.intro);
  const [seoTitle, setSeoTitle] = useState<Localized>(page.seo.title);
  const [seoDescription, setSeoDescription] = useState<Localized>(page.seo.description);
  const [body, setBody] = useState<Localized<RichDoc | null>>(page.body);
  /** Bumped by "Bərpa et" so the editor of that language remounts with the restored text. */
  const [bodyVersion, setBodyVersion] = useState<Record<Locale, number>>({ az: 0, en: 0, ru: 0 });

  const hasIntro = HAS_INTRO.has(page.key);
  const hasBody = HAS_BODY.has(page.key);
  const set = (setter: React.Dispatch<React.SetStateAction<Localized>>, l: Locale, value: string) => setter((prev) => ({ ...prev, [l]: value }));

  const empty = Object.fromEntries(
    locales.map((l) => [
      l,
      !title[l].trim() || (hasIntro && !intro[l].trim()) || (hasBody && !body[l]) || !seoTitle[l].trim() || !seoDescription[l].trim(),
    ]),
  ) as Record<Locale, boolean>;

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-6">
      <input type="hidden" name="key" value={page.key} />
      <div className="rounded-[10px] bg-white p-6">
        <LangTabs empty={{ en: empty.en, ru: empty.ru }}>
          {(l) => (
            <>
              <label className="flex flex-col gap-1.5 text-body-sm">
                Başlıq ({LANG_LABEL[l]})
                <input name={`title.${l}`} value={title[l]} onChange={(e) => set(setTitle, l, e.target.value)} maxLength={120} className={input} />
              </label>

              {hasIntro ? (
                <label className="flex flex-col gap-1.5 text-body-sm">
                  Giriş mətni ({LANG_LABEL[l]})
                  <textarea name={`intro.${l}`} value={intro[l]} onChange={(e) => set(setIntro, l, e.target.value)} maxLength={600} rows={4} className={textarea} />
                </label>
              ) : (
                <input type="hidden" name={`intro.${l}`} value={intro[l]} />
              )}

              {hasBody ? (
                <div className="flex flex-col gap-1.5 text-body-sm">
                  <div className="flex items-center justify-between">
                    <span>Məzmun ({LANG_LABEL[l]})</span>
                    <button
                      type="button"
                      onClick={() => {
                        setBody((prev) => ({ ...prev, [l]: defaultBody }));
                        setBodyVersion((prev) => ({ ...prev, [l]: prev[l] + 1 }));
                      }}
                      className="h-9 rounded-[4px] px-3 text-body-sm underline hover:bg-gray-100"
                    >
                      Bərpa et (Figma mətni)
                    </button>
                  </div>
                  <RichTextEditor
                    key={`${l}-${bodyVersion[l]}`}
                    name={`body.${l}`}
                    initial={body[l]}
                    label={`Məzmun (${LANG_LABEL[l]})`}
                    onChange={(doc) => setBody((prev) => ({ ...prev, [l]: doc }))}
                  />
                </div>
              ) : null}

              <label className="flex flex-col gap-1.5 text-body-sm">
                SEO sərlövhəsi ({LANG_LABEL[l]})
                <input name={`seoTitle.${l}`} value={seoTitle[l]} onChange={(e) => set(setSeoTitle, l, e.target.value)} maxLength={70} className={input} />
              </label>
              <label className="flex flex-col gap-1.5 text-body-sm">
                SEO təsviri ({LANG_LABEL[l]})
                <textarea
                  name={`seoDescription.${l}`}
                  value={seoDescription[l]}
                  onChange={(e) => set(setSeoDescription, l, e.target.value)}
                  maxLength={160}
                  rows={3}
                  className={textarea}
                />
                <span className={`text-caption ${seoDescription[l].length > SEO_DESCRIPTION_TARGET ? "text-red-700" : "text-gray-500"}`}>
                  {seoDescription[l].length} / {SEO_DESCRIPTION_TARGET}
                </span>
              </label>
            </>
          )}
        </LangTabs>
        {!hasBody && <input type="hidden" name="body.az" value="" />}
        {!hasBody && <input type="hidden" name="body.en" value="" />}
        {!hasBody && <input type="hidden" name="body.ru" value="" />}
      </div>
      <p className="text-caption text-gray-500">Qırmızı nöqtə: həmin dildə boş sahə var, saytda AZ mətni göstəriləcək.</p>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="h-10 rounded-[4px] bg-brand-950 px-6 text-body-md text-white disabled:opacity-60">
          Yadda saxla
        </button>
        {state?.ok && <p role="status" className="text-body-sm text-green-600">Yadda saxlanıldı</p>}
        {state?.error && <p role="alert" className="text-body-sm text-red-700">{state.error}</p>}
      </div>
    </form>
  );
}
