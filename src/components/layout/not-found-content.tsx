"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { defaultLocale, hasLocale, type Localized } from "@/i18n/config";

export type NotFoundStrings = { title: string; back: string; home: string };

/**
 * not-found.tsx gets no params, so only this small part reads the language on the client.
 * It receives just the not-found strings of each language, not the dictionaries.
 */
export function NotFoundContent({ strings }: { strings: Localized<NotFoundStrings> }) {
  const param = useParams<{ lang?: string }>().lang ?? "";
  const t = strings[hasLocale(param) ? param : defaultLocale];
  return (
    <main className="container-site flex flex-col items-start gap-6 py-[120px]">
      <p className="text-h1 text-brand-950">404</p>
      <h1 className="text-h4 text-brand-950">{t.title}</h1>
      <Link href={t.home} className="text-body-md text-brand-700 underline">
        {t.back}
      </Link>
    </main>
  );
}
