/** Humans need more than this to fill the form (measured from hydration). */
export const MIN_FILL_MS = 3000;

/**
 * Spam traps of the contact form.
 * - "bot": the hidden honeypot is filled, or the form came back faster than a person can type
 *   (with a real start time) → answered with a silent fake success.
 * - "notReady": no start time (sent before the page was interactive, or without JS). That is not a
 *   bot signal, so the visitor gets a visible "send again" error and keeps what was typed.
 */
export function spamCheck(form: FormData, now = Date.now()): "ok" | "bot" | "notReady" {
  if (String(form.get("website") ?? "") !== "") return "bot";
  const startedAt = Number(form.get("startedAt"));
  if (!Number.isFinite(startedAt) || startedAt <= 0) return "notReady";
  return now - startedAt < MIN_FILL_MS ? "bot" : "ok";
}
