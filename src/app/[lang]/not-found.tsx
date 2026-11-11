"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { defaultLocale, hasLocale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { href } from "@/i18n/routes";

export default function NotFound() {
  const param = useParams<{ lang?: string }>().lang ?? "";
  const lang = hasLocale(param) ? param : defaultLocale;
  const t = dict(lang);
  return (
    <main className="container-site flex flex-col items-start gap-6 py-[120px]">
      <p className="text-h1 text-brand-950">404</p>
      <h1 className="text-h4 text-brand-950">{t.notFound.title}</h1>
      <Link href={href("home", lang)} className="text-body-md text-brand-700 underline">
        {t.notFound.back}
      </Link>
    </main>
  );
}
