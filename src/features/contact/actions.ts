"use server";

import { after } from "next/server";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { hasLocale, type Locale } from "@/i18n/config";
import { clientIpHash } from "@/lib/client-ip";
import { sendMail } from "@/lib/mail";
import { consumeAttempt } from "@/lib/rate-limit";
import { getContactSettings } from "./queries";
import { parseContactForm } from "./schema";

export type ContactState =
  | { ok?: boolean; errors?: Record<string, string>; values?: Record<string, string>; formError?: "rateLimited" | "server" }
  | undefined;

const MIN_FILL_MS = 3000;
const LIMIT = 5; // messages per IP per hour
const WINDOW_SEC = 60 * 60;

export async function sendContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  // Spam traps first: the hidden field must stay empty; humans need more than 3 s to fill the form.
  const startedAt = Number(form.get("startedAt"));
  if (String(form.get("website") ?? "") !== "" || !startedAt || Date.now() - startedAt < MIN_FILL_MS) {
    return { ok: true }; // silent: do not tell bots they were caught
  }

  const settings = await getContactSettings();
  const parsed = parseContactForm(form, settings.topics.map((t) => t.id));
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values };
  const d = parsed.data;

  // Counted only for valid messages, so typos do not use up the hourly quota.
  const ipHash = await clientIpHash();
  if (!(await consumeAttempt(`contact:${ipHash}`, LIMIT, WINDOW_SEC))) {
    return { formError: "rateLimited", values: { ...d } };
  }

  const langRaw = String(form.get("lang") ?? "az");
  const lang: Locale = hasLocale(langRaw) ? langRaw : "az";
  const topic = settings.topics.find((t) => t.id === d.topic)!;
  try {
    await db.insert(contactMessages).values({
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
      phone: d.phone,
      message: d.message,
      topicId: topic.id,
      topicLabel: topic.label.az,
      lang,
      ipHash,
    });
  } catch (error) {
    console.error("contact: insert failed", error);
    // Give the typed values back so nothing the visitor wrote is lost.
    return { formError: "server", values: { ...d } };
  }
  // The message is saved; the notification goes out after the response, so a slow or broken
  // mail server never keeps the visitor waiting (sendMail never throws, 10 s timeouts).
  after(() =>
    sendMail({
      to: settings.notifyEmails,
      subject: `Zavod.az — yeni müraciət: ${topic.label.az}`,
      replyTo: d.email,
      text: [
        `Ad: ${d.firstName} ${d.lastName}`,
        `E-mail: ${d.email}`,
        `Telefon: ${d.phone}`,
        `Mövzu: ${topic.label.az}`,
        `Dil: ${lang}`,
        "",
        d.message,
      ].join("\n"),
    }),
  );
  return { ok: true };
}
