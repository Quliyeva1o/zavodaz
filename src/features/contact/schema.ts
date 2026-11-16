import { z } from "zod";
import { CONTACT_FIELDS, MESSAGE_MAX } from "./constants";

export { CONTACT_FIELDS, MESSAGE_MAX };

// Error messages are dictionary keys (t.contact.errors[key]); the form translates them.
const text = (max: number) => z.string().trim().min(1, "required").max(max, "tooLong");

export const contactSchema = (topicIds: string[]) =>
  z.object({
    firstName: text(60),
    lastName: text(60),
    email: z.string().trim().min(1, "required").max(200, "tooLong").pipe(z.email("email")),
    phone: z.string().trim().min(1, "required").regex(/^\+?[\d\s()-]{9,20}$/, "phone"),
    topic: z.string().refine((v) => topicIds.includes(v), "topic"),
    message: text(MESSAGE_MAX),
  });

export type ContactInput = z.infer<ReturnType<typeof contactSchema>>;

export function parseContactForm(form: FormData, topicIds: string[]) {
  const raw = Object.fromEntries(CONTACT_FIELDS.map((k) => [k, String(form.get(k) ?? "")])) as Record<string, string>;
  const parsed = contactSchema(topicIds).safeParse(raw);
  if (parsed.success) return { ok: true as const, data: parsed.data };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
  return { ok: false as const, errors, values: raw };
}
