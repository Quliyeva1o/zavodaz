// Figma fixture (Tapşırıq 12) üçün saf məlumat və köməkçilər (DB-siz, unit-testlənir).
// Kataloq kartları Figma "Frame 23" 281:7097 sırası ilə (desktop 273:6507); tövsiyə edilənlər (449:14064) eyni
// sıra və şəkillərdir; Zavodlar (299:7696) 15 eyni "Zavod" kartıdır (şəkil 951922…).
import type { FactoryType } from "../../src/features/catalog/types";

/** Figma kart mətni (281:7099 və s.): ad və təsvir. */
export const FIGMA_CARD_NAME = "Lorem ipsum dolor";
export const FIGMA_CARD_ABOUT = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor...";
export const FIGMA_CARD_RATING = 3.5;

/** Kart şəkilləri: Figma IMAGE fill-lərinin imageRef-i (npm run figma:assets -- --photos → design/manual-export/catalog/). */
export const PHOTO_DIR = "design/manual-export/catalog";
const P = {
  a: "ea75ee7b13fe21e55dd4649da2eafc0b32e65b9b",
  b: "b48edddc60f49568902fc537cb072b3cdd775a41",
  c: "951922e99f1096917b71234fb3ded608b1e6ad8f",
  d: "3a0ad5d0965676b40f1629224f5c9d36f0f84bcc",
  e: "67168929e3c2c6e54d6a1c11b343568cb4f3a4bf",
  f: "fc097fa737ec98da08d8e36c46d4980402d9618b",
} as const;

/** 281:7097-dəki 15 kart, sətir-sətir (tip yazısı Figma-da: KOMBİNAT, fabrİk, Zavod, AQROPARK, emalatxana, SEX). */
export const FIGMA_CARDS: readonly { type: FactoryType; photo: string }[] = [
  { type: "kombinat", photo: P.a },
  { type: "fabrik", photo: P.b },
  { type: "zavod", photo: P.c },
  { type: "aqropark", photo: P.d },
  { type: "zavod", photo: P.c },
  { type: "emalatxana", photo: P.e },
  { type: "emalatxana", photo: P.e },
  { type: "sex", photo: P.f },
  { type: "kombinat", photo: P.a },
  { type: "kombinat", photo: P.a },
  { type: "fabrik", photo: P.b },
  { type: "aqropark", photo: P.d },
  { type: "fabrik", photo: P.b },
  { type: "zavod", photo: P.c },
  { type: "kombinat", photo: P.a },
];

/** Bütün fərqli şəkillər (export üçün). */
export const FIGMA_PHOTOS: readonly string[] = [...new Set(FIGMA_CARDS.map((c) => c.photo))];

/** Doldurucu sayı: cəmi 150 → səhifələmə "1 2 3 … 10" (kataloq, Zavodlar və tövsiyə edilənlərdə). */
export const FILLER_COUNT = 135;
/** Zavodlar 1-ci səhifəsi: 3 Figma "Zavod" kartı + 12 VIP zavod doldurucu. */
const ZAVOD_PAGE_FILLERS = 12;

export type FixtureRow = {
  slug: string;
  type: FactoryType;
  name: string;
  about: string;
  photo: string | null;
  verified: boolean;
  tariffCode: "vip" | "premium";
  tariffRank: 2 | 1;
  ratingAvg: number;
  createdAt: Date;
};

/**
 * 150 zavod, default sıra ilə (VIP → Premium; təsdiqlənmiş; ən yeni əvvəl):
 * - 1–15: Figma kartları (VIP, təsdiqlənib, ən yeni) — kataloq və tövsiyə edilənlərin 1-ci səhifəsi;
 * - 16–27: VIP zavod doldurucular (Figma kartı kimi) — Zavodlar 1-ci səhifəsi (3 Figma zavodundan sonra);
 * - 28–150: Premium zavod doldurucular (şəkilsiz, köhnə tarix).
 * Hamısı Premium/VIP və ən azı 136-sı zavoddur: üç siyahının hər birində 10 səhifə olur.
 */
export function figmaFixtureRows(newest = new Date(Date.UTC(2026, 10, 1))): FixtureRow[] {
  const at = (i: number) => new Date(newest.getTime() - i * 60_000);
  const card = { name: FIGMA_CARD_NAME, about: FIGMA_CARD_ABOUT, verified: true, ratingAvg: FIGMA_CARD_RATING };
  const rows: FixtureRow[] = FIGMA_CARDS.map((c, i) => ({
    ...card,
    slug: `figma-${String(i + 1).padStart(3, "0")}`,
    type: c.type,
    photo: c.photo,
    tariffCode: "vip",
    tariffRank: 2,
    createdAt: at(i),
  }));
  for (let k = 0; k < FILLER_COUNT; k++) {
    const i = FIGMA_CARDS.length + k;
    const vip = k < ZAVOD_PAGE_FILLERS;
    rows.push({
      ...card,
      slug: `figma-${String(i + 1).padStart(3, "0")}`,
      type: "zavod",
      photo: vip ? P.c : null,
      tariffCode: vip ? "vip" : "premium",
      tariffRank: vip ? 2 : 1,
      createdAt: at(i + (vip ? 0 : 10_000)),
    });
  }
  return rows;
}

/** Fixture yalnız lokal bazada işləyir (localhost / 127.0.0.1); xəta mesajında URL yoxdur (sirr sızmasın). */
export function assertLocalDb(url: string): void {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    // aşağıda rədd olunur
  }
  if (host !== "localhost" && host !== "127.0.0.1") throw new Error("Figma fixture yalnız lokal bazada işləyir (localhost)");
}
