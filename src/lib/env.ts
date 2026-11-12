import "server-only";
import { z } from "zod";

const production = process.env.NODE_ENV === "production";

const schema = production
  ? z.object({
      SITE_URL: z.url({ protocol: /^https?$/ }),
      DATABASE_URL: z.string().min(1),
      IP_HASH_SALT: z.string().min(32, "ən azı 32 simvol olmalıdır (`openssl rand -hex 32`)"),
    })
  : z.object({
      SITE_URL: z.string().default("http://localhost:3000"),
      DATABASE_URL: z.string().default(""),
      IP_HASH_SALT: z.string().default(""),
    });

const parsed = schema.safeParse({
  // An empty value counts as unset.
  SITE_URL: process.env.SITE_URL || undefined,
  DATABASE_URL: process.env.DATABASE_URL || undefined,
  IP_HASH_SALT: process.env.IP_HASH_SALT || undefined,
});

if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Mühit dəyişənləri səhvdir (production):\n${lines}\nshared/.env faylını yoxla (deploy/cpanel/env.example).`);
}

/** Validated at process start in production (see instrumentation.ts); dev keeps local fallbacks. */
export const siteUrl = parsed.data.SITE_URL.replace(/\/$/, "");
export const databaseUrl = parsed.data.DATABASE_URL;
export const ipHashSalt = parsed.data.IP_HASH_SALT;
