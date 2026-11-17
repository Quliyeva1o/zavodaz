"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { sendContact, type ContactState } from "@/features/contact/actions";
import { CONTACT_FIELDS, MESSAGE_MAX } from "@/features/contact/constants";
import { MIN_FILL_MS } from "@/features/contact/spam";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { TextareaField } from "@/components/ui/textarea-field";

type Props = { lang: Locale; topics: SelectOption[]; t: Dictionary["contact"]; homeHref: string };
/** `n` counts submissions: the form is re-mounted after each one (fresh defaults, counter, dropdown). */
type Submitted = { n: number; result: ContactState };

/**
 * Figma 153:4664 (desktop: 2 rows × 2 fields 295 wide, gap 16; Mövzu; Mesaj; 24 → 48px button) and
 * 692:19335 (mobile: one column, gap 12). Spam traps (features/contact/spam.ts): honeypot field + minimum fill time (startedAt is the
 * hydration time, added at submit; without it the message is refused with a visible "send again" error).
 */
export function ContactForm({ lang, topics, t, homeHref }: Props) {
  const startedAt = useRef(0);
  const form = useRef<HTMLFormElement>(null);
  const [dismissed, setDismissed] = useState(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const [state, action, pending] = useActionState<Submitted, FormData>(async (prev, data) => {
    data.set("startedAt", String(startedAt.current));
    try {
      return { n: prev.n + 1, result: await sendContact(prev.result, data) };
    } catch {
      // Network / server crash: keep what was typed.
      return { n: prev.n + 1, result: { formError: "server", values: Object.fromEntries(CONTACT_FIELDS.map((k) => [k, String(data.get(k) ?? "")])) } };
    }
  }, { n: 0, result: undefined });

  const r = state.result;
  const v = r?.values ?? {};
  const err = (k: string) => {
    const key = r?.errors?.[k] as keyof typeof t.errors | undefined;
    return key ? (t.errors[key] ?? t.errors.required) : undefined;
  };

  // After a failed submit, focus the first field with an error. After a success the (empty) form
  // starts over, so the next message is timed from now, not from the first page load.
  useEffect(() => {
    if (state.result?.errors) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    if (state.result?.ok) startedAt.current = Date.now();
    // Sent before the timer started (e.g. replayed right after hydration): the visitor has been
    // typing all along, so sending again is accepted at once instead of looking like a bot.
    if (state.result?.formError === "notReady") startedAt.current = Math.min(startedAt.current || Infinity, Date.now() - MIN_FILL_MS);
  }, [state]);

  // After the success dialog closes, focus returns to the (now empty) form.
  useEffect(() => {
    if (dismissed > 0) form.current?.querySelector<HTMLElement>("#f-firstName")?.focus();
  }, [dismissed]);

  const f = t.form;
  return (
    <>
      <form key={state.n} ref={form} action={action} noValidate className="flex flex-col gap-6">
        <input type="hidden" name="lang" value={lang} />
        {/* Honeypot: invisible to people, filled in by naive bots. */}
        <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
        <div className="flex flex-col gap-3 lg:gap-4">
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
            <Field name="firstName" label={f.firstName} placeholder={f.firstNamePlaceholder} required autoComplete="given-name" maxLength={60} defaultValue={v.firstName} error={err("firstName")} />
            <Field name="lastName" label={f.lastName} placeholder={f.lastNamePlaceholder} required autoComplete="family-name" maxLength={60} defaultValue={v.lastName} error={err("lastName")} />
          </div>
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
            <Field name="email" type="email" label={f.email} placeholder={f.emailPlaceholder} required autoComplete="email" maxLength={200} defaultValue={v.email} error={err("email")} />
            <Field name="phone" type="tel" label={f.phone} placeholder={f.phonePlaceholder} required autoComplete="tel" maxLength={20} defaultValue={v.phone} error={err("phone")} />
          </div>
          <SelectField name="topic" required label={f.topic} placeholder={f.topicPlaceholder} options={topics} defaultValue={v.topic} error={err("topic")} />
          <TextareaField name="message" label={f.message} placeholder={f.messagePlaceholder} required maxLength={MESSAGE_MAX} defaultValue={v.message} error={err("message")} />
        </div>
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {f.submit}
        </Button>
        {r?.formError && (
          <p role="alert" className="text-body-sm text-red-700">
            {t.errors[r.formError]}
          </p>
        )}
      </form>
      {r?.ok && dismissed !== state.n && (
        <Modal
          open
          onClose={() => setDismissed(state.n)}
          title={t.success.title}
          closeLabel={t.success.close}
          actions={
            <ButtonLink href={homeHref} size="lg" className="w-full">
              {t.success.home}
            </ButtonLink>
          }
        >
          <p className="text-body-md text-gray-500">{t.success.text}</p>
        </Modal>
      )}
    </>
  );
}
