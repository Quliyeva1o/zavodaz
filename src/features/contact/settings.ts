import { locales, type Localized } from "@/i18n/config";

export type ContactTopic = { id: string; label: Localized };
export type ContactSettings = { topics: ContactTopic[]; notifyEmails: string[] };

const topic = (id: string, az: string, en: string, ru: string): ContactTopic => ({ id, label: { az, en, ru } });

export const defaultContactSettings: ContactSettings = {
  topics: [
    topic("cooperation", "Əməkdaşlıq", "Cooperation", "Сотрудничество"),
    topic("payments", "Paket ödənişləri", "Package payments", "Оплата пакетов"),
    topic("advertising", "Reklam", "Advertising", "Реклама"),
    topic("other", "Digər", "Other", "Другое"),
  ],
  notifyEmails: [],
};

const isLocalized = (v: unknown): v is Localized =>
  !!v && typeof v === "object" && locales.every((l) => typeof (v as Record<string, unknown>)[l] === "string");

/** Stored JSON → settings; anything malformed falls back to the defaults as a whole (logged). */
export function mergeContactSettings(stored: unknown): ContactSettings {
  if (!stored || typeof stored !== "object") return defaultContactSettings;
  const s = stored as Partial<ContactSettings>;
  const topicsOk =
    Array.isArray(s.topics) &&
    s.topics.length > 0 &&
    s.topics.every((t) => t && typeof t.id === "string" && /^[a-z0-9-]{1,40}$/.test(t.id) && isLocalized(t.label));
  const emailsOk = s.notifyEmails === undefined || (Array.isArray(s.notifyEmails) && s.notifyEmails.every((e) => typeof e === "string"));
  if (!topicsOk || !emailsOk) {
    console.error("contact settings: stored value is invalid, using defaults");
    return defaultContactSettings;
  }
  return { topics: s.topics!, notifyEmails: s.notifyEmails ?? [] };
}
