"use client";

import { useState, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";

const LANGS: { code: Locale; label: string }[] = [
  { code: "az", label: "AZ" },
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
];

/**
 * AZ | EN | RU tabs. Every panel stays mounted (only hidden), so all languages are always submitted.
 * `empty[lang]` puts a red dot on the tab: that language falls back to AZ on the site.
 */
export function LangTabs({ empty, children }: { empty?: Partial<Record<Locale, boolean>>; children: (lang: Locale) => ReactNode }) {
  const [active, setActive] = useState<Locale>("az");
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Dil" className="flex gap-1 border-b border-gray-200">
        {LANGS.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            role="tab"
            id={`tab-${code}`}
            aria-selected={active === code}
            aria-controls={`panel-${code}`}
            onClick={() => setActive(code)}
            className={`-mb-px flex h-10 items-center gap-2 border-b-2 px-4 text-body-md ${
              active === code ? "border-brand-950 text-brand-950" : "border-transparent text-gray-500 hover:text-brand-950"
            }`}
          >
            {label}
            {empty?.[code] && <span aria-label="Boşdur (AZ mətni göstəriləcək)" title="Boşdur (AZ mətni göstəriləcək)" className="size-2 rounded-full bg-red-700" />}
          </button>
        ))}
      </div>
      {LANGS.map(({ code }) => (
        <div key={code} role="tabpanel" id={`panel-${code}`} aria-labelledby={`tab-${code}`} hidden={active !== code} className="flex flex-col gap-4">
          {children(code)}
        </div>
      ))}
    </div>
  );
}
