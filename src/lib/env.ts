import "server-only";
import path from "node:path";
import { z } from "zod";

const production = process.env.NODE_ENV === "production";

// Outgoing mail (contact notifications). SMTP_HOST unset = mail is skipped (logged), never an error.
const smtpFields = (defaultPort: number) => ({
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(defaultPort),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("Zavod.az <noreply@zavod.az>"),
});

const schema = production
  ? z.object({
      SITE_URL: z.url({ protocol: /^https?$/ }),
      DATABASE_URL: z.string().min(1),
      IP_HASH_SALT: z.string().min(32, "ən azı 32 simvol olmalıdır (`openssl rand -hex 32`)"),
      UPLOAD_DIR: z.string().min(1),
      ...smtpFields(465),
    })
  : z.object({
      SITE_URL: z.string().default("http://localhost:3000"),
      DATABASE_URL: z.string().default(""),
      IP_HASH_SALT: z.string().default(""),
      UPLOAD_DIR: z.string().default(path.join(process.cwd(), "uploads")),
      ...smtpFields(1027), // Mailpit (docker compose)
    });

const keys = ["SITE_URL", "DATABASE_URL", "IP_HASH_SALT", "UPLOAD_DIR", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"] as const;
// An empty value counts as unset.
const parsed = schema.safeParse(Object.fromEntries(keys.map((k) => [k, process.env[k] || undefined])));

if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Mühit dəyişənləri səhvdir (production):\n${lines}\nshared/.env faylını yoxla (deploy/cpanel/env.example).`);
}

/** Validated at process start in production (see instrumentation.ts); dev keeps local fallbacks. */
export const siteUrl = parsed.data.SITE_URL.replace(/\/$/, "");
export const databaseUrl = parsed.data.DATABASE_URL;
export const ipHashSalt = parsed.data.IP_HASH_SALT;
/** Absolute directory of uploaded media (`<id>/<w>.webp`); lives outside the release so deploys keep it. */
export const uploadDir = path.resolve(parsed.data.UPLOAD_DIR);
export const smtp: { host?: string; port: number; user?: string; pass?: string; from: string } = {
  host: parsed.data.SMTP_HOST,
  port: parsed.data.SMTP_PORT,
  user: parsed.data.SMTP_USER,
  pass: parsed.data.SMTP_PASS,
  from: parsed.data.SMTP_FROM,
};
