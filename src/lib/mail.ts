import "server-only";
import nodemailer from "nodemailer";
import { smtp } from "@/lib/env";

const transport = smtp.host
  ? nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
      // Fail fast: nodemailer defaults are 2 min (connect) and 10 min (socket).
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    })
  : null;

/** Sends a plain-text email. Never throws: a mail failure must not lose the saved submission. */
export async function sendMail(o: { to: string[]; subject: string; text: string; replyTo?: string }): Promise<boolean> {
  if (!o.to.length) {
    console.warn("mail: no recipients (admin → contact settings) — skipped", o.subject);
    return false;
  }
  if (!transport) {
    console.warn("mail: SMTP_HOST is not set — skipped", o.subject);
    return false;
  }
  try {
    await transport.sendMail({ from: smtp.from, to: o.to, subject: o.subject, text: o.text, replyTo: o.replyTo });
    return true;
  } catch (error) {
    console.error("mail: send failed", error);
    return false;
  }
}
