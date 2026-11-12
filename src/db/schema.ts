import { bigint, boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Localized } from "@/i18n/config";
import type { RichDoc } from "@/features/pages/types";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
};

// ---------- Users & sessions (admins now, factory accounts in step 6) ----------

export const userRole = pgEnum("user_role", ["admin", "factory"]);
export const userStatus = pgEnum("user_status", ["active", "blocked"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: userRole("role").notNull(),
  /** Admins sign in with email; factories with a username (Figma "İstifadəçi adı"). */
  email: text("email").unique(),
  username: text("username").unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  status: userStatus("status").notNull().default("active"),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the cookie token — the raw token is never stored. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

// ---------- Infrastructure ----------

/** Last invalidation time per cache tag, shared by all app processes (lib/cache). */
export const cacheTags = pgTable("cache_tags", {
  tag: text("tag").primaryKey(),
  expiredAt: bigint("expired_at", { mode: "number" }).notNull(),
});

/** Admin-edited site-wide settings (header/footer contacts, socials), one JSON row per key. */
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/** Fixed-window counters for login and form limits (lib/rate-limit). */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});

// ---------- Static pages (title, short intro, rich body, SEO) ----------
export const pages = pgTable("pages", {
  key: text("key").primaryKey(), // terms | privacy | help | tariffs | contact
  title: jsonb("title").$type<Localized>().notNull(),
  intro: jsonb("intro").$type<Localized>().notNull(),
  body: jsonb("body").$type<Localized<RichDoc | null>>().notNull(),
  seo: jsonb("seo").$type<{ title: Localized; description: Localized }>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const faqItems = pgTable("faq_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: jsonb("question").$type<Localized>().notNull(),
  answer: jsonb("answer").$type<Localized>().notNull(),
  sort: integer("sort").notNull().default(0),
  published: boolean("published").notNull().default(true),
  ...timestamps,
});

export const tariffPlans = pgTable("tariff_plans", {
  code: text("code").primaryKey(), // standart | premium | vip
  icon: text("icon").notNull(), // asterisk | diamonds-four | crown-simple
  name: jsonb("name").$type<Localized>().notNull(),
  /** Prices in qəpik (1 ₼ = 100). 0 = free. */
  priceMonthQ: integer("price_month_q").notNull(),
  priceYearQ: integer("price_year_q"),
  features: jsonb("features").$type<Localized<string[]>>().notNull(),
  /** null = unlimited; enforced in step 9. */
  limits: jsonb("limits").$type<{ products: number | null; vacancies: number | null }>().notNull(),
  sort: integer("sort").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    topicId: text("topic_id").notNull(),
    /** Topic label (AZ) at the time of sending — topics can be renamed later. */
    topicLabel: text("topic_label").notNull(),
    message: text("message").notNull(),
    lang: text("lang").notNull(),
    ipHash: text("ip_hash").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contact_messages_created_idx").on(t.createdAt)],
);
