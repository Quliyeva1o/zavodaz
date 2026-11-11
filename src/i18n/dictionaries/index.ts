import type { Locale } from "../config";
import { az, type Dictionary } from "./az";
import { en } from "./en";
import { ru } from "./ru";

const all: Record<Locale, Dictionary> = { az, en, ru };

export const dict = (lang: Locale): Dictionary => all[lang];
export type { Dictionary };
