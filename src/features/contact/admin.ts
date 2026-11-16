import { z } from "zod";
import { locales, type Localized } from "@/i18n/config";
import type { ContactSettings } from "./settings";

export type TopicRaw = { id: string; label: Localized };
export type ContactRaw = { topics: TopicRaw[]; notifyEmails: string };

const TR: Record<string, string> = { ə: "e", ı: "i", ö: "o", ü: "u", ç: "c", ş: "s", ğ: "g" };
const ID_RULE = /^[a-z0-9-]{1,40}$/;

/** "Paket ödənişləri" → "paket-odenisleri" (AZ transliteration; fits the id rule in mergeContactSettings). */
export function slugify(label: string): string {
  const s = label
    .trim()
    .replace(/İ/g, "i")
    .toLowerCase()
    .replace(/[əıöüçşğ]/g, (c) => TR[c])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return s || "movzu";
}

function uniqueId(base: string, taken: Set<string>): string {
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base.slice(0, 40 - String(n).length - 1)}-${n}`;
  return id;
}

export function splitEmails(v: string): string[] {
  return [...new Set(v.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean))];
}

export function rawFromSettings(s: ContactSettings): ContactRaw {
  return { topics: s.topics.map((t) => ({ id: t.id, label: { ...t.label } })), notifyEmails: s.notifyEmails.join("\n") };
}

export function rawFromForm(form: FormData): ContactRaw {
  const get = (k: string) => String(form.get(k) ?? "");
  const count = Math.min(Math.max(Number(get("topics.count")) || 0, 0), 50);
  const topics = Array.from({ length: count }, (_, i) => ({
    id: get(`topics.${i}.id`),
    label: Object.fromEntries(locales.map((l) => [l, get(`topics.${i}.${l}`)])) as Localized,
  }));
  return { topics, notifyEmails: get("notifyEmails") };
}

const emailSchema = z.email();

export function parseContactSettings(raw: ContactRaw): { ok: true; data: ContactSettings } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (raw.topics.length === 0) errors.topics = "Ən azı bir mövzu olmalıdır";
  const taken = new Set(raw.topics.map((t) => t.id).filter((id) => ID_RULE.test(id)));
  const topics = raw.topics.map((t, i) => {
    const label = Object.fromEntries(locales.map((l) => [l, t.label[l].trim()])) as Localized;
    if (!label.az) errors[`topics.${i}.az`] = "AZ ad məcburidir";
    for (const l of locales) if (label[l].length > 60) errors[`topics.${i}.${l}`] = "Ən çox 60 simvol";
    let id = t.id;
    if (!ID_RULE.test(id)) {
      id = uniqueId(slugify(label.az), taken);
      taken.add(id);
    }
    return { id, label };
  });
  const notifyEmails = splitEmails(raw.notifyEmails);
  const bad = notifyEmails.find((e) => !emailSchema.safeParse(e).success);
  if (bad) errors.notifyEmails = `E-mail düzgün deyil: ${bad}`;
  else if (notifyEmails.length > 10) errors.notifyEmails = "Ən çox 10 e-mail";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { topics, notifyEmails } };
}
