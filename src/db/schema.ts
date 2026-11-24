import { sql } from "drizzle-orm";
import { bigint, boolean, check, index, integer, jsonb, pgEnum, pgTable, primaryKey, real, serial, smallint, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { Localized } from "@/i18n/config";
import type { RichDoc } from "@/features/pages/types";
import type { SocialKey } from "@/features/settings/links";

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

// ---------- Catalog: filter dictionaries, media, factories (step 2) ----------

export const factoryType = pgEnum("factory_type", ["zavod", "fabrik", "sex", "emalatxana", "kombinat", "aqropark"]);
export const factoryStatus = pgEnum("factory_status", ["draft", "published", "hidden"]);

const dictColumns = () => ({
  id: serial("id").primaryKey(),
  /** Same in every language (spec §5), unique per dictionary. */
  slug: text("slug").notNull().unique(),
  name: jsonb("name").$type<Localized>().notNull(),
  sort: integer("sort").notNull().default(0),
});
export const dictCities = pgTable("dict_cities", dictColumns());
export const dictIndustries = pgTable("dict_industries", dictColumns());
export const dictProductTypes = pgTable("dict_product_types", dictColumns());
export const dictProductionModels = pgTable("dict_production_models", dictColumns());

/**
 * Uploads (spec §6.5), files under UPLOAD_DIR/<id>/.
 * image: WebP variants + blur placeholder. pdf (catalogues): `<id>/file.pdf`; width/height 0, no variants, blur "".
 */
export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").$type<"image" | "pdf">().notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  /** Widths that exist as `<id>/<w>.webp`, ascending. */
  variants: jsonb("variants").$type<number[]>().notNull(),
  blur: text("blur").notNull(), // data:image/webp;base64,…
  /** Bytes on disk (all variants of an image; the PDF file itself). */
  size: integer("size").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const factories = pgTable(
  "factories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // step 6
    type: factoryType("type").notNull(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    /** Figma anket "Haqqında 0/400"; the card shows the first two lines. */
    about: text("about").notNull().default(""),
    industryId: integer("industry_id").references(() => dictIndustries.id, { onDelete: "set null" }),
    productTypeId: integer("product_type_id").references(() => dictProductTypes.id, { onDelete: "set null" }),
    cityId: integer("city_id").references(() => dictCities.id, { onDelete: "set null" }),
    productionModelIds: integer("production_model_ids").array().notNull().default(sql`'{}'::int[]`),
    cooperation: text("cooperation").array().notNull().default(sql`'{}'::text[]`),
    coverId: uuid("cover_id").references(() => media.id, { onDelete: "set null" }),
    // ---- Factory page (step 3). Single-language content (spec §4): everyone sees the same text. ----
    /** Figma "Agro Trade Supply MMC" under the name. */
    legalName: text("legal_name").notNull().default(""),
    logoId: uuid("logo_id").references(() => media.id, { onDelete: "set null" }),
    /** "Texniki imkanlar" tab; line breaks are kept. */
    equipmentText: text("equipment_text").notNull().default(""),
    employeeCount: integer("employee_count"),
    capacityText: text("capacity_text").notNull().default(""),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    website: text("website").notNull().default(""),
    address: text("address").notNull().default(""),
    youtubeUrl: text("youtube_url").notNull().default(""),
    /** Only the networks the factory filled in (the same six as the site footer). */
    socials: jsonb("socials").$type<Partial<Record<SocialKey, string>>>().notNull().default({}),
    verified: boolean("verified").notNull().default(false),
    status: factoryStatus("status").notNull().default("draft"),
    tariffCode: text("tariff_code").notNull().default("standart"),
    tariffUntil: timestamp("tariff_until", { withTimezone: true }),
    /** 2 vip, 1 premium, 0 otherwise — set on save; step 9 cron resets expired ones. */
    tariffRank: smallint("tariff_rank").notNull().default(0),
    ratingAvg: real("rating_avg").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    // Default order (user decision 2026-11-17): VIP → Premium → rest, verified first, newest first.
    index("factories_pub_default_idx")
      .on(t.tariffRank.desc().nullsFirst(), t.verified.desc().nullsFirst(), t.createdAt.desc().nullsFirst(), t.id.desc().nullsFirst())
      .where(sql`${t.status} = 'published'`),
    index("factories_pub_type_idx")
      .on(t.type, t.tariffRank.desc().nullsFirst(), t.verified.desc().nullsFirst(), t.createdAt.desc().nullsFirst(), t.id.desc().nullsFirst())
      .where(sql`${t.status} = 'published'`),
    // Must match ORDER BY exactly (catalog-sql.ts). Postgres: DESC means NULLS FIRST in ORDER BY, so DESC index columns
    // are declared NULLS FIRST (drizzle defaults to NULLS LAST, which the planner cannot use for ORDER BY ... DESC).
    index("factories_pub_rating_desc_idx")
      .on(t.ratingAvg.desc().nullsFirst(), t.ratingCount.desc().nullsFirst(), t.id.desc().nullsFirst())
      .where(sql`${t.status} = 'published'`),
    index("factories_pub_rating_asc_idx")
      .on(t.ratingAvg, t.ratingCount.desc().nullsFirst(), t.id.desc().nullsFirst())
      .where(sql`${t.status} = 'published'`),
    index("factories_city_idx").on(t.cityId),
    index("factories_industry_idx").on(t.industryId),
    index("factories_product_type_idx").on(t.productTypeId),
    index("factories_models_gin").using("gin", t.productionModelIds),
    index("factories_coop_gin").using("gin", t.cooperation),
  ],
);

// ---------- Factory page: gallery, certificates, PDF catalogues, products, vacancies, ratings (step 3) ----------
// Every `media_id` here must also be in the reference check of features/media/sweep.ts (indexed for that NOT EXISTS).

/** Products and vacancies: only `published` ones are public (and only while their factory is published). */
export const contentStatus = pgEnum("content_status", ["draft", "published", "hidden"]);

/** "Media" tab photos, at most 6 (checked by the admin action). */
export const factoryImages = pgTable(
  "factory_images",
  {
    factoryId: uuid("factory_id")
      .notNull()
      .references(() => factories.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.factoryId, t.mediaId] }), index("factory_images_media_idx").on(t.mediaId)],
);

export const factoryCertificates = pgTable(
  "factory_certificates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    factoryId: uuid("factory_id")
      .notNull()
      .references(() => factories.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id),
    title: text("title").notNull().default(""),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("factory_certificates_factory_idx").on(t.factoryId, t.sort), index("factory_certificates_media_idx").on(t.mediaId)],
);

/** PDF catalogues ("Məhsullar" tab); `media.kind` = pdf. */
export const factoryFiles = pgTable(
  "factory_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    factoryId: uuid("factory_id")
      .notNull()
      .references(() => factories.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id),
    title: text("title").notNull(),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("factory_files_factory_idx").on(t.factoryId, t.sort), index("factory_files_media_idx").on(t.mediaId)],
);

export const products = pgTable(
  "products",
  {
    /** Also the public 7-digit product code (`…/mehsullar/1519494-mehsulun-adi`): numbering starts at 1 000 000. */
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ startWith: 1_000_000 }),
    factoryId: uuid("factory_id")
      .notNull()
      .references(() => factories.id, { onDelete: "cascade" }),
    /** Cosmetic part of the URL; a wrong one redirects to the right one (the code is the key). */
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    /** Figma "Təsvir 0/400" (checked by the admin action). */
    description: text("description").notNull().default(""),
    status: contentStatus("status").notNull().default("draft"),
    ...timestamps,
  },
  (t) => [
    // Factory "Məhsullar" tab and "Oxşar məhsullar": newest first. DESC columns NULLS FIRST to match ORDER BY … DESC.
    index("products_factory_list_idx").on(t.factoryId, t.status, t.createdAt.desc().nullsFirst(), t.id.desc().nullsFirst()),
  ],
);

/** At most 6 per product (checked by the admin action); the lowest `sort` is the main image. */
export const productImages = pgTable(
  "product_images",
  {
    productId: bigint("product_id", { mode: "number" })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.productId, t.mediaId] }), index("product_images_media_idx").on(t.mediaId)],
);

/** Spec §4. The factory tab lists them now; CRUD and the public vacancy page arrive in step 8. */
export const vacancies = pgTable(
  "vacancies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    factoryId: uuid("factory_id")
      .notNull()
      .references(() => factories.id, { onDelete: "cascade" }),
    /** `/vakansiyalar/<slug>`. */
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    cityId: integer("city_id").references(() => dictCities.id, { onDelete: "set null" }),
    /** Monthly amount in whole currency units; null = not stated. */
    salary: integer("salary"),
    currency: text("currency").notNull().default("AZN"),
    employmentType: text("employment_type").notNull().default(""),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    /** Figma "Haqqında 0/700". */
    description: text("description").notNull().default(""),
    status: contentStatus("status").notNull().default("draft"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("vacancies_slug_idx").on(t.slug),
    index("vacancies_factory_list_idx").on(t.factoryId, t.status, t.publishedAt.desc().nullsFirst(), t.id.desc().nullsFirst()),
  ],
);

/** One vote per voter and factory, which the voter may change (upsert). `voter_hash` = sha256(cookie id + ip hash). */
export const ratings = pgTable(
  "ratings",
  {
    factoryId: uuid("factory_id")
      .notNull()
      .references(() => factories.id, { onDelete: "cascade" }),
    voterHash: text("voter_hash").notNull(),
    score: smallint("score").notNull(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.factoryId, t.voterHash] }), check("ratings_score_check", sql`${t.score} between 1 and 5`)],
);

/**
 * Old public paths → current ones (301), written when a factory or dictionary slug changes (features/factory/slug-redirect.ts).
 * Chains are kept one hop long: every `to_path` is a live path, never another `from_path`.
 */
export const redirects = pgTable(
  "redirects",
  {
    fromPath: text("from_path").primaryKey(),
    toPath: text("to_path").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("redirects_to_idx").on(t.toPath)],
);
