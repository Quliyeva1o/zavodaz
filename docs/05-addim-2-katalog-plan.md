# Addım 2 — Zavod modeli və Kataloq: icra planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Məqsəd:** Zavodların bazası və filtr lüğətləri qurulur, admin zavod əlavə edir (şəkil ilə). Kataloq açılır: filtrlər, səhifələmə, 6 tip səhifəsi, "Tövsiyə edilənlər" və SEO landing-lər (`/fabrikler/baki`). Hamısı 3 dildə, Figma ilə 1:1-dir və 20 000 zavodla sürətli işləyir.

**Arxitektura:**
- Zavodlar və lüğətlər Postgres-dədir.
- Kataloq siyahısı bir sorğu modulundan gəlir (`getCatalogPage(filter)`), `use cache` + `FACTORIES_TAG` ilə cache-lənir. Admin hər yazmadan sonra `invalidateTags` çağırır.
- Filtr vəziyyəti URL query-dədir (`?type=…&city=…&page=…`). Səhifə serverdə render olunur. Desktop filtrləri `next/form` GET formasıdır (JS-siz də işləyir), mobil filtr isə lazy yüklənən dialoqdur.
- Şəkillər admin-dən yüklənir. `sharp` WebP variantları hazırlayır (320/640/960 + blur), fayllar `UPLOAD_DIR`-dədir və `/media/...` route-u ilə uzunmüddətli cache başlığı ilə verilir. `next/image` istifadə olunmur, çünki cPanel-də optimizator yoxdur.

**Texnologiyalar:** addım 0–1 ilə eyni; `sharp` artıq devDependency-dir və dependencies-ə keçir.

**Spec:** [02-spec.md](02-spec.md) (§4 data modeli, §5 URL-lər, §6 performans, §7 SEO) · Figma inventarı: [01-figma-analiz.md](01-figma-analiz.md) §4.3 · Addım 1 planı: [04-addim-1-statik-plan.md](04-addim-1-statik-plan.md)

**Branch:** `addim-2-katalog`, `addim-1-statik`-dən yaradılır (1-ci addımın PR-ı hələ birləşməyib).

## Ümumi qaydalar (hər tapşırığa aiddir)

- **Figma 1:1.** Hər səhifə hissəsi iki yoxlamanı keçməlidir (spec §1.1 bənd 6):
  - (a) həndəsə: ölçü Figma frame-i ilə eynidir, hər görünən Figma mətninin x/y/hündürlüyü ±1px;
  - (b) vizual: pixelmatch ≤ 2.5%, və ya səbəbi yazılmış `maxDiff` (ölçülən dəyər + ~0.5, tavan 7%).

  Əmr: `npm run visual:check`. Referansları dəyişmək, elementi gizlətmək və səbəbsiz hədd vermək qadağandır.
- **Ölçülər.** Dəqiq ölçülər `npm run figma:inspect -- <node-id>` ilə götürülür, gözlə ölçülmür.
  - Figma API-nin `/files` və şəkil endpoint-ləri tez-tez limitə düşür (`low` tier). `/nodes` adətən işləyir. API düşəndə `inspect` avtomatik `design/.cache/file.json` (2026-11-11) nüsxəsinə keçir; `FIGMA_OFFLINE=1` bunu məcburi edir.
  - **Dizayn hələ dəyişir.** Hər UI tapşırığının əvvəlində öz node-larını canlı API ilə yoxla (`figma:inspect`, `FIGMA_OFFLINE`-siz). Lokal nüsxədən fərq varsa, controller-ə bildir.
- **Rəng və text style** yalnız `src/styles/tokens.css`-dəndir. Figma-dakı xam px dəyərləri `[..px]` kimi yazıla bilər.
- **Ölçü sərhədi:** `< 1024px` mobildir (Figma 320), `≥ 1024px` desktopdur (Figma 1440). 1024–1439 aralığında üfüqi scroll olmamalıdır (fluid, 1440-da Figma ilə eyni). Mətn qutularında `min-h-*`, toxunma sahəsi ≥ 44px.
- **Dillər:** AZ prefikssizdir, `/en`, `/ru` prefikslidir. UI mətnləri lüğətdəndir. Lüğət adları (`name: Localized`) EN/RU-da boşdursa AZ-a düşür (`pick`).
- **JS büdcəsi** (spec §6.1): ≤ 150 KB gzip polyfill xaric, öz kodumuz ≤ 15 KB. Client komponentlər zod və server modullarını import etmir. Mobil filtr dialoqu `next/dynamic` ilə lazy yüklənir.
- **Admin:** hər admin səhifəsi və action `requireAdmin()`-i özü çağırır. Hər yazmadan sonra uyğun teq `invalidateTags` ilə yenilənir.
- **Hər tapşırıq:**
  - TDD: əvvəl uğursuz test yazılır.
  - Sonra `npm run typecheck && npm run lint && npm run test:unit` işlədilir.
  - E2E olanlarda `npm run build && npm run test:e2e` işlədilir (port 3100 boş olsun, öz başlatdığın serveri dayandır).
  - Commit mesajı Azərbaycanca olur, sonunda boş sətir + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Mühit:**
  - Playwright sistem Chrome-u ilə işləyir (`channel: "chrome"`).
  - Lokal baza Docker-dədir, `localhost:5442`. Kompüter yenidən başlayıbsa, Docker Desktop əl ilə açılmalıdır, sonra `docker compose -f docker-compose.dev.yml up -d`.
  - Yük testi ayrı bazada aparılır: `zavod_load` (Tapşırıq 11), dev bazası Figma fixture-u saxlayır.

## İstifadəçinin qərarları (2026-11-17)

| Mövzu | Qərar |
|---|---|
| Filtr dəyərləri | Figma-dakılarla başlanır (admin-dən dəyişdirilə bilər) |
| Default sıralama (reytinq seçilməyəndə) | VIP → Premium → digərləri; hər qrupda əvvəl "Təsdiqlənib", sonra ən yeni |
| "Tövsiyə edilənlər" | Paket alanlar (Premium/VIP) avtomatik düşür; 9-cu addıma qədər tarifi admin verir |

## Controller qərarları

- **Filtr dəyərləri Figma-dan götürülür** (`Mob/Filtr/*` frame-ləri). Düzəlişlər:
  - Figma yazı xətaları düzəldilir: "Sənaye avadamlıqları" → "Sənaye avadanlıqları", "Elektirk" → "Elektrik".
  - Mobil "İstehsalat Modeli" siyahısında səhvən "Paltar və tekstil məhsulları" var. Desktop-dakı "Hazır məhsul istehsalçısı" götürülür.
- **Şəhər/Region:** Figma yalnız siyahının əvvəlini göstərir (Ağcabədi … Biləsuvar, əlifba sırası). Tam siyahı Azərbaycanın şəhər və rayonlarıdır (aşağıdakı Tapşırıq 2), sıra əlifbadır, "Bakı" xüsusi deyil.
- **Tip filtri** checkbox-dur (çox seçimli). Qalan filtrlər tək seçimli dropdown-dur (Figma-da hamısı "Hamısı" + siyahıdır). Lazım olsa, istehsalat modeli sonra çox seçimliyə çevrilə bilər.
- **Səhifə ölçüsü hamı üçün 15-dir** (desktop Figma 3×5). Mobil Figma 8 kart göstərir, amma eyni URL həm mobil, həm desktopdur, server ekranı bilmir. Ona görə mobil həndəsə yalnız kataloqun yuxarı hissəsini və səhifələməni yoxlayır.
- **Reklam banneri** (məzmun ilə footer arası, 240px) 1-ci addımdakı kimi 5-ci addımda əlavə olunur. Bu addımda Figma-dakı 120px boşluq qalır.
- **Kartdakı "Ətraflı"** `/fabrik/<slug>`-a aparır. Zavod səhifəsi 3-cü addımdadır, ona qədər bu ünvan 404 verir.
- **Tip URL-ləri:**

  | Tip | AZ | EN | RU |
  |---|---|---|---|
  | zavod | `zavodlar` | `plants` | `zavody` |
  | fabrik | `fabrikler` | `factories` | `fabriki` |
  | sex | `sexler` | `workshops` | `cekhi` |
  | emalatxana | `emalatxanalar` | `ateliers` | `masterskie` |
  | kombinat | `kombinatlar` | `complexes` | `kombinaty` |
  | aqropark | `aqroparklar` | `agroparks` | `agroparki` |

  Tövsiyə edilənlər: `/kataloq/tovsiyye-edilenler`, `/en/catalog/recommended`, `/ru/katalog/rekomenduemye`. Zavod: `/fabrik/<slug>`, `/en/factory/<slug>`, `/ru/fabrika/<slug>`.
- **Lüğət slug-ları** (şəhər, sahə, məhsul tipi, model) bütün dillərdə eynidir: ASCII, AZ transliterasiyası. Şəhər və sahə slug-ları bir-biri ilə toqquşmamalıdır, çünki landing-də eyni seqmentdə dururlar. Bunu DB yoxlamır, admin action yoxlayır.
- **SEO:**
  - İndekslənir: `/kataloq`, tip səhifələri, tövsiyə edilənlər, ən azı 1 nəticəsi olan landing.
  - Filtr parametrli URL-lər `noindex, follow` olur, canonical isə filtrsiz bazaya gedir.
  - Səhifələmədə `?page=N` (N≥2) öz URL-inə canonical olur; `page=1` URL-də yazılmır.
  - Mövcud olmayan landing slug-ı və ya `page` > son səhifə 404 verir.
- **Tarif sırası** saxlanılan `tariff_rank` sütunundandır (vip=2, premium=1, digər=0). İndekslə sıralanır, admin saxlayanda hesablanır. Tarif bitəndə 0-a salınması 9-cu addımın cron-udur.
- **Yük testi** ayrıca `zavod_load` bazasında aparılır. Dev bazası Figma fixture-u saxlayır (Tapşırıq 12), ona görə vizual yoxlama sabit məlumatla işləyir.

---

## Fayl xəritəsi

| Fayl | Məsuliyyət |
|---|---|
| `src/features/catalog/types.ts` | `FACTORY_TYPES`, `COOPERATION`, `CatalogFilter`, kart tipi (zod-suz, client-də də istifadə olunur) |
| `src/features/catalog/filter.ts` | URL query → `CatalogFilter` (parse/normalize), filtr → query string, `isFiltered` |
| `src/features/catalog/queries.ts` | `getDictionaries()`, `getCatalogPage(filter)`, `getLandingCounts()` (cache-li) |
| `src/features/catalog/slug.ts` | AZ transliterasiya ilə slug, unikal slug köməkçisi |
| `src/features/catalog/dictionaries.seed.ts` | Figma-dan filtr dəyərləri + şəhər siyahısı (seed məlumatı) |
| `src/features/factories/admin.ts` | zavod formunun zod sxemi, `tariffRankOf`, saxlama köməkçiləri |
| `src/features/media/*` | `processImage` (sharp), `saveUpload`, `mediaUrl`, `srcSet` |
| `src/app/media/[...path]/route.ts` | yüklənmiş faylları verir (path yoxlaması, immutable cache) |
| `src/i18n/routes.ts` | tip, tövsiyə, zavod URL-ləri; `resolvePublicPath` genişlənir |
| `src/components/catalog/*` | `FactoryCard`, `Stars`, `Pagination`, `FilterSidebar`, `MobileFilter`, `CatalogView` |
| `src/app/[lang]/catalog/**` | kataloq, tövsiyə, tip və landing səhifələri |
| `src/app/admin/(panel)/dictionaries/**`, `factories/**` | admin: lüğətlər və zavodlar |
| `scripts/seed/dictionaries.mts`, `figma-fixture.mts`, `load.mts`, `scripts/perf/catalog.mts` | seed-lər və performans yoxlaması |

---

### Tapşırıq 1: Next.js 16.4.6 (təhlükəsizlik yeniləməsi)

`npm audit`: Next ≤16.4.4-də orta səviyyəli problem var ("Information disclosure across root params when a 'use cache' function is called through unstable_cache()"). Kodda `unstable_cache` yoxdur, amma patch versiyası pulsuz düzəlişdir.

**Fayllar:** Dəyiş: `package.json`, `package-lock.json`

- [ ] **Addım 1:** `npm install next@16.4.6 eslint-config-next@16.4.6 --save-exact`. `eslint-config-next` dev-dir: `-D` ilə ayrıca qur.
- [ ] **Addım 2:** `npm audit --omit=dev` → `next` üçün qeyd qalmamalıdır.
- [ ] **Addım 3:** `npm run typecheck && npm run lint && npm run test:unit && npm run build`, sonra server 3100-də işə salınır, `npm run test:e2e && npm run visual:check` işlədilir. Hamısı yaşıl olmalıdır (1-ci addımın 23 hədəfi).
- [ ] **Addım 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: Next.js 16.4.6 — use cache/unstable_cache təhlükəsizlik düzəlişi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 2: Lüğətlər, zavod cədvəli, slug və Figma filtr dəyərləri

**Fayllar:**
- Yarat: `src/features/catalog/types.ts`, `src/features/catalog/slug.ts`, `src/features/catalog/dictionaries.seed.ts`, `scripts/seed/dictionaries.mts`, `tests/unit/catalog-slug.test.ts`, `tests/unit/catalog-dictionaries.test.ts`
- Dəyiş: `src/db/schema.ts`, `src/lib/cache/tag-store.ts` (`FACTORIES_TAG`, `DICTIONARIES_TAG`), `src/lib/cache/tags.ts` (re-export), `package.json` (`db:seed-dictionaries`), `scripts/seed/content-seed.ts` (lüğətləri də çağırır), `deploy/cpanel/deploy.sh` (dəyişmir, çünki `db:seed-content` hamısını çağırır)
- Yarat (generate): `drizzle/0002_*.sql`

**İnterfeyslər — verir:**
- `FACTORY_TYPES = ["zavod","fabrik","sex","emalatxana","kombinat","aqropark"] as const`, `type FactoryType`
- `COOPERATION = ["distributor","partner","sales"] as const`, `type Cooperation`
- `TARIFF_RANK = { standart: 0, premium: 1, vip: 2 } as const`
- `slugify(text: string): string`: AZ transliterasiyası (ə→e, ı→i, ş→s, ç→c, ğ→g, ö→o, ü→u, İ→i), kiçik hərf, `[a-z0-9]+` tire ilə
- `uniqueSlug(base: string, taken: (s: string) => Promise<boolean>): Promise<string>`, məsələn `agro-trade`, `agro-trade-2`
- cədvəllər: `dictCities`, `dictIndustries`, `dictProductTypes`, `dictProductionModels` (eyni sütunlar), `factories`, `media`
- `DICTIONARY_SEED: Record<"cities"|"industries"|"productTypes"|"productionModels", { slug: string; name: Localized }[]>`

- [ ] **Addım 1: Uğursuz testlər**

`tests/unit/catalog-slug.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, uniqueSlug } from "../../src/features/catalog/slug.ts";

test("Azerbaijani letters are transliterated, separators collapse to one dash", () => {
  assert.equal(slugify("Ağcabədi"), "agcabedi");
  assert.equal(slugify("Qida sənayesi"), "qida-senayesi");
  assert.equal(slugify("  İxrac — yönümlü!! "), "ixrac-yonumlu");
  assert.equal(slugify("Şəki / Çinar ÜÖĞ"), "seki-cinar-uog");
});

test("empty input gives an empty slug (caller must reject it)", () => {
  assert.equal(slugify("—"), "");
});

test("uniqueSlug appends -2, -3 … while taken", async () => {
  const taken = new Set(["agro", "agro-2"]);
  assert.equal(await uniqueSlug("agro", async (s) => taken.has(s)), "agro-3");
  assert.equal(await uniqueSlug("yeni", async (s) => taken.has(s)), "yeni");
});
```

`tests/unit/catalog-dictionaries.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { DICTIONARY_SEED } from "../../src/features/catalog/dictionaries.seed.ts";

test("Figma filter values (Mob/Filtr frames), typos fixed", () => {
  const names = (k: keyof typeof DICTIONARY_SEED) => DICTIONARY_SEED[k].map((d) => d.name.az);
  assert.deepEqual(names("industries"), [
    "Metal emalı", "Maşınqayırma", "Tekstil (Toxuculuq)", "Qida sənayesi", "Kimya sənayesi",
    "Plastik və polimer emalı", "Tikinti materialları istehsalı", "Kənd təsərrüfatı istehsalı",
    "Ağac və mebel istehsalı", "Enerji və alternativ enerji istehsalı",
  ]);
  assert.deepEqual(names("productTypes"), [
    "Ərzaq məhsulları", "Sənaye avadanlıqları", "Əlvan metallar və profillər", "Paltar və tekstil məhsulları",
    "Plastik və qablaşdırma məhsulları", "Elektrik avadanlıqlar", "Tikinti materialları",
  ]);
  assert.deepEqual(names("productionModels"), [
    "İxrac yönümlü", "Daxili bazara yönəlmiş", "Xammal emalı müəssisəsi", "Hazır məhsul istehsalçısı",
    "OEM (Orijinal avadanlıq istehsalçısı)",
  ]);
  assert.deepEqual(names("cities").slice(0, 12), [
    "Ağcabədi", "Ağdam", "Ağdaş", "Ağdərə", "Ağstafa", "Ağsu", "Astara", "Babək", "Bakı", "Beyləqan", "Bərdə", "Biləsuvar",
  ]);
});

test("slugs are unique per dictionary and across cities + industries (landing segment)", () => {
  for (const list of Object.values(DICTIONARY_SEED)) {
    assert.equal(new Set(list.map((d) => d.slug)).size, list.length);
  }
  const both = [...DICTIONARY_SEED.cities, ...DICTIONARY_SEED.industries].map((d) => d.slug);
  assert.equal(new Set(both).size, both.length);
});
```

Run → FAIL (fayllar yoxdur).

- [ ] **Addım 2: `types.ts` və `slug.ts`**

`src/features/catalog/types.ts`:

```ts
// No zod, no server imports: also used by client components (filters).
export const FACTORY_TYPES = ["zavod", "fabrik", "sex", "emalatxana", "kombinat", "aqropark"] as const;
export type FactoryType = (typeof FACTORY_TYPES)[number];
export const isFactoryType = (v: string): v is FactoryType => (FACTORY_TYPES as readonly string[]).includes(v);

export const COOPERATION = ["distributor", "partner", "sales"] as const;
export type Cooperation = (typeof COOPERATION)[number];
export const isCooperation = (v: string): v is Cooperation => (COOPERATION as readonly string[]).includes(v);

export const TARIFF_RANK = { standart: 0, premium: 1, vip: 2 } as const;
export const PAGE_SIZE = 15;

export type CatalogSort = "default" | "rating_desc" | "rating_asc";
```

`src/features/catalog/slug.ts`:

```ts
const MAP: Record<string, string> = { ə: "e", ı: "i", ş: "s", ç: "c", ğ: "g", ö: "o", ü: "u", i̇: "i" };

/** ASCII URL slug (spec §5): Azerbaijani letters transliterated, anything else becomes one dash. */
export function slugify(text: string): string {
  return text
    .replace(/İ/g, "i")
    .toLowerCase()
    .replace(/[əışçğöü]|i̇/g, (ch) => MAP[ch] ?? ch)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** `base`, else `base-2`, `base-3` … — the first one `taken` says is free. */
export async function uniqueSlug(base: string, taken: (s: string) => Promise<boolean>): Promise<string> {
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    if (!(await taken(candidate))) return candidate;
  }
}
```

- [ ] **Addım 3: Seed məlumatı** `src/features/catalog/dictionaries.seed.ts`
  - `industries`, `productTypes`, `productionModels`: testdəki sıra ilə.
  - `cities`: Azərbaycanın şəhər və rayonları, AZ əlifbası sırası ilə (testdəki ilk 12-si Figma-dakı kimi). Siyahının sonuna qədər tam yazılır: Abşeron … Zərdab, Naxçıvan MR-in şəhər/rayonları daxil (Babək, Culfa, Kəngərli, Naxçıvan, Ordubad, Sədərək, Şahbuz, Şərur), Şuşa, Xankəndi, Xocalı, Xocavənd, Laçın, Kəlbəcər, Qubadlı, Zəngilan, Cəbrayıl, Füzuli. Hər element: `{ slug: slugify(az), name: { az, en, ru } }`.
  - EN/RU adları: şəhərlərdə rəsmi latın/kiril yazılışı (`Baku`/`Баку`, `Ganja`/`Гянджа`). Sahə və məhsul tiplərinin EN/RU tərcüməsi indi yazılır (admin dəyişə bilər).
  - Toqquşma testi (`cities` ∩ `industries`) keçməlidir.

- [ ] **Addım 4: Sxem** — `src/db/schema.ts`-ə:

```ts
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

/** Uploaded images (spec §6.5): WebP variants + blur placeholder, files under UPLOAD_DIR/<id>/. */
export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").notNull(), // image
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  /** Widths that exist as `<id>/<w>.webp`, ascending. */
  variants: jsonb("variants").$type<number[]>().notNull(),
  blur: text("blur").notNull(), // data:image/webp;base64,…
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
      .on(t.tariffRank.desc(), t.verified.desc(), t.createdAt.desc(), t.id.desc())
      .where(sql`${t.status} = 'published'`),
    index("factories_pub_type_idx")
      .on(t.type, t.tariffRank.desc(), t.verified.desc(), t.createdAt.desc(), t.id.desc())
      .where(sql`${t.status} = 'published'`),
    index("factories_pub_rating_idx").on(t.ratingAvg, t.ratingCount).where(sql`${t.status} = 'published'`),
    index("factories_city_idx").on(t.cityId),
    index("factories_industry_idx").on(t.industryId),
    index("factories_product_type_idx").on(t.productTypeId),
    index("factories_models_gin").using("gin", t.productionModelIds),
    index("factories_coop_gin").using("gin", t.cooperation),
  ],
);
```

`serial`, `smallint`, `real`, `sql` import-larını əlavə et (`sql`: `drizzle-orm`-dan). `npm run db:generate`, yaranan SQL-i oxu: indekslərin `WHERE status = 'published'` və GIN olduğunu yoxla. Sonra `npm run db:migrate`.

- [ ] **Addım 5: Teqlər və seed**
  - `tag-store.ts`: `export const FACTORIES_TAG = "factories"; export const DICTIONARIES_TAG = "dictionaries";` və `tags.ts` re-export-u.
  - `scripts/seed/dictionaries.mts` və `content-seed.ts`-in içində `seedDictionaries(tx)`: hər lüğət üçün `insert … onConflictDoNothing({ target: slug }).returning()`, `sort` = siyahıdakı indeks. Nəsə əlavə olunubsa, `DICTIONARIES_TAG` və `FACTORIES_TAG` teqləri `recordTagInvalidations(tx, …)` ilə yazılır.
  - `seedContent` lüğətləri də çağırır, beləliklə `deploy.sh` (build-dən əvvəl `db:seed-content`) dəyişmədən işləyir.
  - `tests/e2e/seed-content.spec.ts`-ə bir yoxlama əlavə et: lüğət sətirləri yaranır, ikinci çağırış heç nə əlavə etmir.
- [ ] **Addım 6:** `npm run test:unit` → PASS. `npm run db:seed-content` → lüğətlər bazada (`select count(*) from dict_cities` → tam siyahının sayı).
- [ ] **Addım 7: Commit** — `feat: zavod cədvəli, filtr lüğətləri (Figma dəyərləri), slug və media cədvəli`

---

### Tapşırıq 3: Şəkil yükləmə və verilməsi (media)

**Fayllar:**
- Yarat: `src/features/media/process.ts`, `src/features/media/store.ts`, `src/features/media/url.ts`, `src/app/media/[...path]/route.ts`, `tests/unit/media.test.ts`, `tests/fixtures/sample.jpg` (kiçik test şəkli, 1200×900)
- Dəyiş: `package.json` (`sharp` → dependencies), `src/lib/env.ts` (`UPLOAD_DIR`, production-da məcburi), `.env.example`, `.gitignore` (`/uploads`), `deploy/cpanel/README.md` (`UPLOAD_DIR` app qovluğundan kənarda, məs. `~/zavod-uploads`; deploy onu silmir)

**İnterfeyslər — verir:**
- `MEDIA_WIDTHS = [320, 640, 960] as const`, `MAX_UPLOAD_BYTES = 8 * 1024 * 1024`, `ALLOWED_TYPES = ["image/jpeg","image/png","image/webp"]`
- `processImage(input: Buffer): Promise<{ width: number; height: number; blur: string; files: { width: number; data: Buffer }[] }>`: orijinaldan kiçik olmayan enlər atılır, ən azı bir variant olur (orijinal en ≤ 320 olsa belə)
- `saveImage(file: File): Promise<{ id: string } | { error: "type" | "size" | "decode" }>`: yoxlayır, `processImage`-i çağırır, `UPLOAD_DIR/<id>/<w>.webp` yazır, `media` sətri yaradır
- `mediaSrc(m: { id: string; variants: number[] }, target: number): string` → `/media/<id>/<w>.webp`; `mediaSrcSet(m)` → `"/media/<id>/320.webp 320w, …"`
- Route `GET /media/<uuid>/<w>.webp`: yalnız `^[0-9a-f-]{36}/(320|640|960)\.webp$`, `Content-Type: image/webp`, `Cache-Control: public, max-age=31536000, immutable`, olmayan fayl üçün 404

- [ ] **Addım 1: Uğursuz test** — `tests/unit/media.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { processImage } from "../../src/features/media/process.ts";
import { mediaSrc, mediaSrcSet, isMediaPath } from "../../src/features/media/url.ts";

test("processImage makes WebP variants no wider than the original, plus a tiny blur", async () => {
  const out = await processImage(await readFile("tests/fixtures/sample.jpg"));
  assert.deepEqual(out.files.map((f) => f.width), [320, 640, 960]);
  assert.equal((await sharp(out.files[0].data).metadata()).format, "webp");
  assert.match(out.blur, /^data:image\/webp;base64,/);
  assert.ok(out.blur.length < 1200);
});

test("a small image still gets one variant at its own width", async () => {
  const small = await sharp({ create: { width: 200, height: 100, channels: 3, background: "#888" } }).jpeg().toBuffer();
  const out = await processImage(small);
  assert.deepEqual(out.files.map((f) => f.width), [200]);
});

test("URLs and the strict path check", () => {
  const m = { id: "0b8f7a7e-0000-4000-8000-000000000001", variants: [320, 640, 960] };
  assert.equal(mediaSrc(m, 600), "/media/0b8f7a7e-0000-4000-8000-000000000001/640.webp");
  assert.equal(mediaSrc(m, 2000), "/media/0b8f7a7e-0000-4000-8000-000000000001/960.webp");
  assert.match(mediaSrcSet(m), /320\.webp 320w, .*640\.webp 640w, .*960\.webp 960w$/);
  assert.equal(isMediaPath(["0b8f7a7e-0000-4000-8000-000000000001", "640.webp"]), true);
  assert.equal(isMediaPath(["..", "etc", "passwd"]), false);
  assert.equal(isMediaPath(["0b8f7a7e-0000-4000-8000-000000000001", "640.png"]), false);
});
```

Run → FAIL.

- [ ] **Addım 2: İmplementasiya**
  - `process.ts`: `sharp(input).rotate()` (EXIF), metadata. Hər en üçün `.resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 })`. Orijinal 320-dən dar olanda tək variant öz enində. Blur: `.resize(16).webp({ quality: 40 })` → base64.
  - `url.ts`: `"use server"` yox, zod yox. Client də import edə bilər. `isMediaPath(parts: string[])` regex ilə.
  - `store.ts` (`import "server-only"`): tip və ölçü yoxlaması, `randomUUID`, `mkdir`, fayllar `writeFile` ilə yazılır, `db.insert(media)`. Xəta olsa, yazılmış qovluq `rm -rf` ilə silinir.
  - Route handler: `params.path` → `isMediaPath`. `path.join(env.UPLOAD_DIR, id, file)` həll edilmiş yolun `UPLOAD_DIR` ilə başladığı yoxlanılır, sonra `readFile` → `new Response(data, …)`. `export const dynamic`-ə ehtiyac yoxdur, amma Cache Components altında route handler dinamikdir. Next 16 sənədinə bax: `node_modules/next/dist/docs/` → route handlers.
- [ ] **Addım 3: E2E** — `tests/e2e/media.spec.ts`: admin olmadan `/media/../x` → 404; mövcud olmayan uuid → 404. Yükləmə axını Tapşırıq 10-da yoxlanılır.
- [ ] **Addım 4:** unit + typecheck + lint → yaşıl. **Commit:** `feat: şəkil yükləmə — WebP variantları, blur, /media route-u (immutable cache)`

---

### Tapşırıq 4: URL-lər — tip səhifələri, tövsiyə, landing, zavod

**Fayllar:**
- Dəyiş: `src/i18n/routes.ts`, `tests/unit/routes.test.ts`, lüğətlər (`az/en/ru.ts`: tip adları, səhifə başlıqları)

**İnterfeyslər — verir:**
- `typeRoutes: Record<FactoryType, Localized>` (Controller qərarlarındakı cədvəl)
- `staticRoutes.factory = { az: "fabrik", en: "factory", ru: "fabrika" }`
- `CATALOG_RECOMMENDED: Localized = { az: "tovsiyye-edilenler", en: "recommended", ru: "rekomenduemye" }`
- `typeHref(type: FactoryType, lang: Locale, landing?: string): string`
- `recommendedHref(lang: Locale): string`, `factoryHref(slug: string, lang: Locale): string`
- `resolvePublicPath` əlavələri:
  - `/zavodlar` → `/az/catalog/type/zavod`
  - `/zavodlar/baki` → `/az/catalog/type/zavod/baki`
  - `/kataloq/tovsiyye-edilenler` → `/az/catalog/recommended`
  - `/en/catalog/recommended` → `/en/catalog/recommended`
  - başqa dilin tip seqmenti → `notFound`
  - 2-dən çox seqment → `notFound`
- `switchLocalePath` tip, landing və tövsiyə səhifələrini düzgün çevirir (landing slug eyni qalır)

- [ ] **Addım 1: Uğursuz testlər** — `tests/unit/routes.test.ts`-ə:

```ts
test("factory type pages and landings", () => {
  assert.deepEqual(resolvePublicPath("/fabrikler"), { kind: "rewrite", internal: "/az/catalog/type/fabrik" });
  assert.deepEqual(resolvePublicPath("/fabrikler/baki"), { kind: "rewrite", internal: "/az/catalog/type/fabrik/baki" });
  assert.deepEqual(resolvePublicPath("/en/factories/qida-senayesi"), { kind: "rewrite", internal: "/en/catalog/type/fabrik/qida-senayesi" });
  assert.deepEqual(resolvePublicPath("/ru/fabriki"), { kind: "rewrite", internal: "/ru/catalog/type/fabrik" });
  assert.deepEqual(resolvePublicPath("/en/fabrikler"), { kind: "notFound", locale: "en" });
  assert.deepEqual(resolvePublicPath("/fabrikler/baki/x"), { kind: "notFound", locale: "az" });
});

test("recommended sub-page is translated", () => {
  assert.deepEqual(resolvePublicPath("/kataloq/tovsiyye-edilenler"), { kind: "rewrite", internal: "/az/catalog/recommended" });
  assert.deepEqual(resolvePublicPath("/ru/katalog/rekomenduemye"), { kind: "rewrite", internal: "/ru/catalog/recommended" });
  assert.deepEqual(resolvePublicPath("/kataloq/recommended"), { kind: "notFound", locale: "az" });
  assert.deepEqual(resolvePublicPath("/kataloq/x"), { kind: "notFound", locale: "az" });
});

test("hrefs and language switch", () => {
  assert.equal(typeHref("sex", "az"), "/sexler");
  assert.equal(typeHref("aqropark", "en", "baki"), "/en/agroparks/baki");
  assert.equal(recommendedHref("en"), "/en/catalog/recommended");
  assert.equal(factoryHref("agro-trade", "ru"), "/ru/fabrika/agro-trade");
  assert.equal(switchLocalePath("/zavodlar/baki", "en"), "/en/plants/baki");
  assert.equal(switchLocalePath("/kataloq/tovsiyye-edilenler", "ru"), "/ru/katalog/rekomenduemye");
  assert.equal(switchLocalePath("/fabrik/agro-trade", "en"), "/en/factory/agro-trade");
});
```

Run → FAIL.

- [ ] **Addım 2: İmplementasiya** (`routes.ts`):
  - `typeRoutes`, `CATALOG_RECOMMENDED`. Tip seqmentləri statik seqmentlərlə toqquşmamalıdır; modul yüklənəndə bir dəfə `throw` ilə yoxla.
  - `resolvePublicPath`-də, statik route tapılmadıqda: tip seqmenti uyğun gəlirsə (yalnız həmin dilin seqmenti) → `["", locale, "catalog", "type", type, ...rest]`, `rest.length > 1` → `notFound`.
  - `route === "catalog" && rest.length`: `rest[0] === CATALOG_RECOMMENDED[locale] && rest.length === 1` → `/catalog/recommended`, əks halda `notFound`.
  - `switchLocalePath`: internal `/catalog/type/<t>/<landing?>` → `typeHref(t, target, landing)`, `/catalog/recommended` → `recommendedHref(target)`.
- [ ] **Addım 3:** `npm run test:unit` → PASS (köhnə routes testləri də). **Commit:** `feat: kataloq URL-ləri — tip səhifələri, tövsiyə edilənlər, landing, zavod ünvanı (3 dil)`

---

### Tapşırıq 5: Kataloq sorğusu və filtr məntiqi

**Fayllar:**
- Yarat: `src/features/catalog/filter.ts`, `src/features/catalog/queries.ts`, `tests/unit/catalog-filter.test.ts`, `tests/e2e/catalog-query.spec.ts` (yalnız DB, rollback tranzaksiyası — `seed-content.spec.ts` nümunəsi)

**İnterfeyslər — verir:**

```ts
export type CatalogScope = { types?: FactoryType[]; recommended?: boolean; landing?: { kind: "city" | "industry"; slug: string } };
export type CatalogFilter = {
  types: FactoryType[]; industry: string | null; city: string | null; product: string | null;
  model: string | null; coop: Cooperation | null; recommended: boolean; sort: CatalogSort; page: number;
};
export function parseCatalogParams(sp: Record<string, string | string[] | undefined>, scope: CatalogScope): CatalogFilter;
export function catalogSearch(f: CatalogFilter, scope: CatalogScope): string; // "" or "?type=fabrik&city=baki&page=2", fixed key order, scope values omitted
export function isFiltered(f: CatalogFilter, scope: CatalogScope): boolean; // anything beyond scope + page → noindex
export type Dict = { id: number; slug: string; name: Localized };
export type Dictionaries = { cities: Dict[]; industries: Dict[]; productTypes: Dict[]; productionModels: Dict[] };
export async function getDictionaries(): Promise<Dictionaries>;                // cacheTag(DICTIONARIES_TAG)
export type FactoryCardData = {
  id: string; slug: string; name: string; about: string; type: FactoryType; verified: boolean;
  ratingAvg: number; cover: { id: string; variants: number[]; blur: string; width: number; height: number } | null;
};
export async function getCatalogPage(f: CatalogFilter): Promise<{ items: FactoryCardData[]; total: number; pageCount: number }>; // cacheTag(FACTORIES_TAG)
export async function getLandingCounts(): Promise<{ type: FactoryType; kind: "city" | "industry"; slug: string; count: number }[]>; // sitemap
```

Query parametrləri bütün dillərdə eynidir: `type` (təkrarlanır), `industry`, `city`, `product`, `model`, `coop`, `sort` (`rating_desc` | `rating_asc`), `page`.

- [ ] **Addım 1: Uğursuz unit testlər** — `tests/unit/catalog-filter.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCatalogParams, catalogSearch, isFiltered } from "../../src/features/catalog/filter.ts";

test("defaults", () => {
  const f = parseCatalogParams({}, {});
  assert.deepEqual(f, { types: [], industry: null, city: null, product: null, model: null, coop: null, recommended: false, sort: "default", page: 1 });
  assert.equal(catalogSearch(f, {}), "");
  assert.equal(isFiltered(f, {}), false);
});

test("unknown values are dropped, types are de-duplicated and kept in FACTORY_TYPES order", () => {
  const f = parseCatalogParams({ type: ["sex", "x", "zavod", "sex"], coop: "bad", sort: "nope", page: "0" }, {});
  assert.deepEqual(f.types, ["zavod", "sex"]);
  assert.equal(f.coop, null);
  assert.equal(f.sort, "default");
  assert.equal(f.page, 1);
});

test("page must be a positive integer within a sane bound", () => {
  assert.equal(parseCatalogParams({ page: "3" }, {}).page, 3);
  assert.equal(parseCatalogParams({ page: "2.5" }, {}).page, 1);
  assert.equal(parseCatalogParams({ page: "99999999" }, {}).page, 1);
});

test("scope wins: a type page ignores ?type, a landing fixes city or industry", () => {
  const f = parseCatalogParams({ type: "zavod", city: "gence" }, { types: ["fabrik"], landing: { kind: "city", slug: "baki" } });
  assert.deepEqual(f.types, ["fabrik"]);
  assert.equal(f.city, "baki");
  assert.equal(catalogSearch(f, { types: ["fabrik"], landing: { kind: "city", slug: "baki" } }), "");
});

test("canonical query string: fixed key order, page last, page=1 omitted", () => {
  const f = parseCatalogParams({ page: "2", city: "baki", type: ["sex", "zavod"], sort: "rating_desc" }, {});
  assert.equal(catalogSearch(f, {}), "?type=zavod&type=sex&city=baki&sort=rating_desc&page=2");
  assert.equal(isFiltered(f, {}), true);
  assert.equal(isFiltered(parseCatalogParams({ page: "4" }, {}), {}), false);
});
```

Run → FAIL.

- [ ] **Addım 2: `filter.ts`** (zod-suz, saf funksiyalar; client də import edir).
  - `first(v)` köməkçisi massivin ilkini götürür.
  - Slug parametrləri `^[a-z0-9-]{1,80}$` olmalıdır, əks halda `null`.
  - `page`: `^\d{1,5}$` və ≥1, əks halda 1.
  - `scope.recommended` → `recommended: true`.
- [ ] **Addım 3: `queries.ts`** (`import "server-only"`):
  - `getDictionaries`: 4 cədvəl `orderBy(sort, id)`, `"use cache"; cacheLife("max"); cacheTag(DICTIONARIES_TAG)`.
  - `getCatalogPage(f)`: `"use cache"; cacheLife("max"); cacheTag(FACTORIES_TAG, DICTIONARIES_TAG)`.
    - Slug → id lüğətdən həll olunur. Naməlum slug "nəticə yoxdur" deməkdir: `{ items: [], total: 0, pageCount: 0 }`, bazaya getmədən.
    - Şərtlər:

```ts
const where = and(
  eq(factories.status, "published"),
  f.types.length ? inArray(factories.type, f.types) : undefined,
  industryId ? eq(factories.industryId, industryId) : undefined,
  cityId ? eq(factories.cityId, cityId) : undefined,
  productTypeId ? eq(factories.productTypeId, productTypeId) : undefined,
  modelId ? sql`${factories.productionModelIds} @> ARRAY[${modelId}]::int[]` : undefined,
  f.coop ? sql`${factories.cooperation} @> ARRAY[${f.coop}]::text[]` : undefined,
  f.recommended ? gt(factories.tariffRank, 0) : undefined,
);
const order =
  f.sort === "rating_desc" ? [desc(factories.ratingAvg), desc(factories.ratingCount), desc(factories.id)]
  : f.sort === "rating_asc" ? [asc(factories.ratingAvg), desc(factories.ratingCount), desc(factories.id)]
  : [desc(factories.tariffRank), desc(factories.verified), desc(factories.createdAt), desc(factories.id)];
```

    - Siyahı: `limit(PAGE_SIZE).offset((page-1)*PAGE_SIZE)`, `leftJoin(media)` cover üçün. Say ayrıca `count(*)` sorğusudur, ikisi `Promise.all` ilə.
  - `getLandingCounts`: `select type, city_id, count(*) … group by` (`published`), həmçinin `industry_id` üzrə. Slug-larla qaytarılır. `cacheTag(FACTORIES_TAG, DICTIONARIES_TAG)`.
- [ ] **Addım 4: DB testi** — `tests/e2e/catalog-query.spec.ts`. Tranzaksiya içində 7 zavod yaradılır və SQL köməkçisinin özü yoxlanılır. Bunun üçün sorğu qurucusunu `buildCatalogQuery(db, f, ids)` adlı cache-siz funksiyaya çıxar, `getCatalogPage` onu çağırsın, test də birbaşa çağırsın. Yoxlanılanlar:
  - default sıra (vip, premium, verified, yeni);
  - `rating_desc`;
  - tip + şəhər filtri;
  - `model` (`@>`) və `coop`;
  - `recommended` yalnız `tariff_rank > 0`;
  - draft/hidden görünmür;
  - `total`/`pageCount`.
- [ ] **Addım 5:** unit + e2e (`npx playwright test tests/e2e/catalog-query.spec.ts`) → yaşıl. **Commit:** `feat: kataloq sorğusu — filtrlər, sıralama (VIP→Premium→digər), səhifələmə, cache`

---

### Tapşırıq 6: Kataloq UI komponentləri — kart, ulduzlar, səhifələmə, ikonlar

**Figma:** kart `281:7099` (desktop "Card", 315×429), mobil kart `736:23882` ("Mob", 288×320), səhifələmə `382:11014`… (`Number`, 40×40, r=500, aktiv `#5D6B9A` = `brand-500`), ulduzlar `I281:7099;1054:41920`…, "Təsdiqlənib" nişanı `I281:7099;1054:41910`. Əvvəl canlı API ilə `figma:inspect` et.

**Fayllar:**
- Yarat: `src/components/catalog/factory-card.tsx`, `src/components/catalog/stars.tsx`, `src/components/catalog/pagination.tsx`, `tests/unit/pagination.test.ts`, `tests/unit/stars.test.ts`
- Dəyiş: `scripts/figma/export-icons.mts` (`ICONS`-a: `seal-check`, `star`, `star-half`, `star-empty` (əgər Figma-da var), `funnel`, `caret-left`, səhifələmə oxları, `x`, `arrow-left` (mobil filtr başlığı) — id-lər inspect ilə), `public/icons/*.svg`, `src/components/ui/icon.tsx` (yeni adlar), lüğətlər (`catalog.more` = "Ətraflı", `catalog.verified` = "Təsdiqlənib", tip etiketləri: "ZAVOD", "FABRİK", "SEX", "EMALATXANA", "KOMBİNAT", "AQROPARK" — CSS `uppercase`, mətn lüğətdə normal hərflə: "Zavod" …)

**İnterfeyslər — verir:**
- `pageItems(current: number, count: number): (number | "gap")[]`: Figma "1 2 3 … 10" naxışı. Testdə: `(1,10)` → `[1,2,3,"gap",10]`; `(5,10)` → `[1,"gap",4,5,6,"gap",10]`; `(10,10)` → `[1,"gap",8,9,10]`; `(1,3)` → `[1,2,3]`.
- `starFills(rating: number): ("full" | "half" | "empty")[]` (5 element). 0.25-ə yuvarlaqlaşdırılır: `<.25` boş, `.25–.74` yarım, `≥.75` dolu. Figma kartı: 3.5 → `[full,full,full,half,empty]`.
- `<FactoryCard data lang priority? />`: server komponentidir.
  - `<article>`; şəkil `<img srcSet sizes="(min-width:1024px) 287px, 264px" loading=lazy decoding=async>`, blur `background-image`; cover yoxdursa Figma rəngi `#D9D9D9` (token-dən).
  - "Təsdiqlənib" yalnız `verified`.
  - tip etiketi, ad (1 sətir, `truncate`), təsvir 2 sətir `line-clamp-2`, ulduzlar (`aria-label="Reytinq 3.5 / 5"`), "Ətraflı" + CaretRight → `factoryHref(slug)`.
  - Bütün kart linkdir: `<a>` ad üzərindədir, `after:absolute after:inset-0` ilə bütün kart klik olur; ikinci link yoxdur.
  - `data-figma="card"`.
- `<Pagination current count hrefFor={(n) => string} label />`: `<nav aria-label>`, cari səhifə `aria-current="page"`, "…" `aria-hidden`. Toxunma sahəsi ≥44 (görünən 40 + görünməz uzantı). JS yoxdur.

- [ ] **Addım 1:** Uğursuz testlər `pagination.test.ts` və `stars.test.ts` (yuxarıdakı dəyərlərlə) → FAIL.
- [ ] **Addım 2:** `pageItems`, `starFills` (`src/components/catalog/*.ts` saf köməkçilər) → PASS.
- [ ] **Addım 3:** İkonlar: `npm run figma:icons`. API 429 verirsə, dayan və controller-ə bildir (1-ci addımdakı kimi brauzerdən export olunacaq).
- [ ] **Addım 4:** Komponentlər Figma ölçüləri ilə yazılır:
  - kart: pad 14/14/16/14, gap 10, r=24, `shadow-[0_16px_40px_0_rgba(130,137,174,0.15)]` token-ə əlavə edilir, şəkil 287×213 r=10;
  - mobil kart: pad 12/12/14/12, r=20, şəkil 264×195.
- [ ] **Addım 5:** typecheck + lint + unit → yaşıl. **Commit:** `feat: zavod kartı, reytinq ulduzları, səhifələmə və kataloq ikonları (Figma)`

---

### Tapşırıq 7: Kataloq səhifəsi (desktop filtr paneli + qrid)

**Figma:** `273:6504` "Kataloq" (desktop). Məzmun bloku `273:6507`: breadcrumb `273:6508`, başlıq `273:6512`, filtr paneli `281:7004` (303 en), qrid `281:7097` (985 en, sətir gap 20, sütun gap 20). Açıq dropdown halı `283:9156` "Filtr" frame-indədir; dropdown 1-ci addımdakı `SelectField`-dir. Mobil `736:23853`: başlıq, "Filtr" düyməsi (288×40, `Funnel` ikon), kartlar sütunda gap 16.

**Fayllar:**
- Yarat: `src/app/[lang]/catalog/page.tsx`, `src/components/catalog/catalog-view.tsx` (server), `src/components/catalog/filter-sidebar.tsx` (server, `next/form`), `src/components/catalog/auto-submit.tsx` (client, ~0.3 KB: formun `change` hadisəsində `requestSubmit()`), `src/components/catalog/type-checkboxes.tsx` (server: `<input type=checkbox name=type>` + Figma checkbox görünüşü), `src/lib/catalog-seo.ts`, `tests/e2e/catalog.spec.ts`
- Dəyiş: `src/components/ui/select-field.tsx` (lazım olsa `onChange` callback-i, hidden input dəyişəndə `change` hadisəsi), lüğətlər (`catalog.title` "Kataloq", `catalog.filter` "Filtr", `catalog.reset` "Filtri sıfırla" — Figma-da "Filtrı" yazılıb, düzgün "Filtri"; `aliases` ilə qeyd; filtr başlıqları; `catalog.all` "Hamısı"; `catalog.sortHigh` "Yüksək reytinqlilər öndə", `catalog.sortLow` "Aşağı reytinqlilər öndə"; `catalog.coop.*`; `catalog.empty` boş nəticə mətni)

**İnterfeyslər:**
- İstifadə edir: `parseCatalogParams`, `catalogSearch`, `isFiltered`, `getDictionaries`, `getCatalogPage`, `FactoryCard`, `Pagination`, `SelectField`, `PageShell`/`Breadcrumb` (1-ci addım), `breadcrumbJsonLd`, `JsonLd`
- Verir:
  - `<CatalogView lang scope searchParams title crumbs basePath />`: Tapşırıq 9 tip, tövsiyə və landing səhifələrində də istifadə edir.
  - `catalogMetadata({ lang, scope, filter, title, description, basePath }): Metadata`: canonical, `noindex` qaydaları (Controller qərarları → SEO).
  - `itemListJsonLd(items, lang)`.

**Davranış:**
- Səhifə `searchParams`-ı oxuyur, ona görə dinamikdir. Məlumat `getCatalogPage` cache-indən gəlir. Qrid `<Suspense>` içindədir, fallback kart skeletləridir (Figma ölçüsündə, layout sürüşməsin deyə).
- Filtr formu `next/form`-dur (`action={basePath}`). Hər filtr `name`-li sahədir, `AutoSubmit` dəyişikliyi göndərir. `<noscript>` içində "Tətbiq et" düyməsi var.
  - "Hamısı" checkbox-u seçiləndə qalan tiplər boşalır (client-də kiçik məntiq; JS-siz "Hamısı" `type` göndərmir).
  - Filtr dəyişəndə `page` sıfırlanır: formda `page` sahəsi yoxdur.
- "Filtri sıfırla" → `basePath`-a link. Yalnız `isFiltered` olanda görünür; Figma `283:9156`-da görünür, `273:6504`-də yoxdur.
- Boş nəticə: qrid yerində mətn + "Filtri sıfırla" linki. Figma-da yoxdur, axtarışın "nəticə tapılmadı" halının stilindən istifadə olunur; node-u `figma:inspect` ilə Axtarış bölməsindən tap.
- `page > pageCount` (və `pageCount > 0`) → `notFound()`.
- Metadata: title "Kataloq | Zavod.az" (lüğət), description lüğətdən. Canonical: filtrsiz və `page>1` olduqda `?page=N`. Filtrli olanda `robots: { index: false, follow: true }`, canonical isə baza.
- JSON-LD: `BreadcrumbList` + `ItemList` (səhifədəki zavodların URL-ləri).

- [ ] **Addım 1: Uğursuz e2e** — `tests/e2e/catalog.spec.ts`. Məlumat: Tapşırıq 12-nin fixture-u hələ yoxdur, ona görə test öz məlumatını yaradır: `tests/e2e/db.ts`-ə `seedCatalogFixture()` / `clearCatalogFixture()`, slug prefiksi `e2e-`.
  - `/kataloq` 200 qaytarır, `h1` "Kataloq", ən azı bir `article`, default sırada VIP fixture birinci gəlir.
  - Tip checkbox-u "Fabrik" → URL `?type=fabrik`, yalnız fabrik kartları qalır. JS söndürülmüş kontekstdə `<noscript>` düyməsi ilə eyni nəticə alınır.
  - Şəhər dropdown-u → `?city=baki`. "Filtri sıfırla" → `/kataloq`.
  - Filtrli URL-də `<meta name="robots" content="noindex, follow">` var və canonical `/kataloq`-a gedir. `?page=2` canonical-ı özüdür.
  - `?page=999` → 404.
  - `/en/catalog` → başlıq EN, kart linki `/en/factory/<slug>`.
  - Run → FAIL.
- [ ] **Addım 2:** İmplementasiya: əvvəl desktop, sonra mobil yuxarı hissə. Mobil "Filtr" düyməsi Tapşırıq 8-in dialoqunu açır, bu tapşırıqda düymə `basePath#filtr`-ə link kimi qalır.
- [ ] **Addım 3:** `npm run build && npx next start -p 3100`, sonra `npx playwright test tests/e2e/catalog.spec.ts tests/e2e/responsive.spec.ts`. `responsive.spec.ts`-ə `/kataloq` əlavə et: 1024, 1280 və 1439-da scrollWidth yoxlanılır.
- [ ] **Addım 4:** JS ölçüsü: kataloq səhifəsinin client chunk-ları gzip ≤ 150 KB (polyfill xaric) olmalıdır. Rəqəmi hesabata yaz.
- [ ] **Addım 5: Commit:** `feat: Kataloq səhifəsi — filtr paneli (JS-siz də), qrid, səhifələmə, SEO (noindex filtrlər, ItemList)`

---

### Tapşırıq 8: Mobil filtr dialoqu

**Figma:** `737:22004` "Mob/Filtr" (siyahı ekranı: 7 filtr adı + "Filtrı sıfırla"). Seçim ekranları: `758:22171` (İstehsalın tipi), `759:22238` (İstehsal sahəsi), `761:22414` (Şəhər / Region), `761:22520` (Məhsul tipi), `761:22666` (İstehsalat Modeli), `761:22725` (Əməkdaşlıq imkanı), `761:22772` (Reytinqinə görə). Hamısı 320×568, tam ekran.

**Fayllar:**
- Yarat: `src/components/catalog/mobile-filter.tsx` (client, `next/dynamic` + `ssr: false`, düyməyə basanda yüklənir), `src/components/catalog/mobile-filter-button.tsx` (client, ~0.5 KB)
- Dəyiş: `catalog-view.tsx` (mobil düymə), `tests/e2e/catalog.spec.ts`

**Davranış:**
- Dialoq `role="dialog" aria-modal`-dır, açılanda fokus başlığa gedir. Escape və ya geri oxu ilə bağlanır, bağlananda fokus "Filtr" düyməsinə qayıdır (1-ci addım `Modal`-ının fokus məntiqi təkrar istifadə olunur).
- Siyahı ekranında hər sətir `button`-dur, seçim ekranını açır. Seçim ekranında "Hamısı" + dəyərlər olur. Tip çox seçimlidir, qalanları tək seçimlidir.
- Seçim edilən kimi `router.push(basePath + catalogSearch(next, scope), { scroll: false })` işləyir, dialoq açıq qalır və siyahı ekranına qayıdır.
- "Filtri sıfırla" → `router.push(basePath)`.
- Server məlumatı (lüğət adları, cari filtr) prop kimi gəlir. Client zod və ya server modulu import etmir; `catalogSearch` saf funksiyadır.
- Düymə `lg:hidden`-dir, dialoq yalnız `< 1024px`-də açılır.

- [ ] **Addım 1: Uğursuz e2e** (`viewport 320×568`):
  - "Filtr" → dialoq açılır, 7 sətir görünür;
  - "Şəhər / Region" → "Bakı" → URL `?city=baki`;
  - "İstehsalın tipi" → "Sex" + "Zavod" → `?type=zavod&type=sex`;
  - "Filtri sıfırla" → `/kataloq`;
  - Escape bağlayır və fokus düyməyə qayıdır.
- [ ] **Addım 2:** İmplementasiya, Figma ölçüləri ilə: `figma:inspect` hər 8 frame üçün.
- [ ] **Addım 3:** e2e + JS ölçüsü: dialoq chunk-ı ilk yüklənmədə olmamalıdır (network-də düyməyə basana qədər yoxdur). **Commit:** `feat: mobil filtr dialoqu (lazy) — Figma Mob/Filtr ekranları`

---

### Tapşırıq 9: Tip səhifələri, Tövsiyə edilənlər, SEO landing-lər və sitemap

**Figma:** tip səhifələri `299:7693` (Zavodlar), `299:8590` (Fabriklər), `299:9591` (Sexlər), `301:10591` (Emalatxana), `1056:48733` (Kombinatlar), `1056:49780` (Aqroparklar). Tövsiyə `449:14061`. Hamısı kataloq ilə eyni layout-dadır; fərq breadcrumb (`Ana səhifə > Kataloq > Zavodlar`) və başlıqdır. İnspect ilə təsdiqlə.

**Fayllar:**
- Yarat: `src/app/[lang]/catalog/type/[type]/page.tsx`, `src/app/[lang]/catalog/type/[type]/[landing]/page.tsx`, `src/app/[lang]/catalog/recommended/page.tsx`
- Dəyiş: `src/app/sitemap.ts`, lüğətlər (tip başlıqları "Zavodlar" … "Aqroparklar", "Tövsiyə edilənlər", landing başlıq şablonu `"{type} — {place}"`, təsvir şablonları), `tests/e2e/catalog.spec.ts`, `tests/e2e/static-pages.spec.ts` (sitemap)

**Davranış:**
- `[type]`: `isFactoryType(type)` deyilsə → `notFound()`. Scope `{ types: [type] }`.
- `[landing]`: slug əvvəlcə şəhərlərdə, sonra sahələrdə axtarılır. Tapılmırsa → `notFound()`. Scope `{ types: [type], landing: { kind, slug } }`.
  - Başlıq: "Fabriklər — Bakı" (`pick(dict.name, lang)`).
  - Breadcrumb: `Ana səhifə > Kataloq > Fabriklər > Bakı`.
  - 0 nəticə → 200 + `noindex` + boş hal.
- `recommended`: scope `{ recommended: true }`, başlıq "Tövsiyə edilənlər".
- `generateStaticParams` yoxdur; səhifələr dinamikdir, məlumat cache-dən gəlir.
- Sitemap:
  - `catalog`, `recommended`, 6 tip, `getLandingCounts()`-da `count ≥ 1` olan landing-lər — 3 dil + hreflang;
  - `lastModified` yoxdur, çünki tək mənbə yoxdur;
  - sitemap 50 000 URL-i keçərsə bölünməlidir: indiki sayda (6 tip × ~80 şəhər/sahə × 3 dil < 2000) bir faylda qalır, kodda şərh kimi qeyd et.

- [ ] **Addım 1: Uğursuz e2e:**
  - `/fabrikler` → h1 "Fabriklər", yalnız fabrik kartları;
  - `/en/factories` → EN başlıq;
  - `/fabrikler/baki` → h1 "Fabriklər — Bakı", breadcrumb 4 addımlı;
  - `/fabrikler/yox-bele-yer` → 404;
  - `/kataloq/tovsiyye-edilenler` → yalnız Premium/VIP fixture-ları;
  - tip səhifəsində tip checkbox-u dəyişəndə `/kataloq?type=…`-ə keçir;
  - `sitemap.xml`-də `/fabrikler/baki` (fixture-da Bakıda fabrik var) var, boş landing yoxdur.
- [ ] **Addım 2:** İmplementasiya (hamısı `CatalogView`-u çağırır). **Addım 3:** e2e yaşıl. **Commit:** `feat: tip səhifələri, Tövsiyə edilənlər, şəhər/sahə landing-ləri və kataloq sitemap-i`

---

### Tapşırıq 10: Admin — lüğətlər və zavodlar

**Fayllar:**
- Yarat:
  - `src/app/admin/(panel)/dictionaries/page.tsx`, `src/app/admin/(panel)/dictionaries/[dict]/page.tsx`, `.../dictionaries/actions.ts`, `.../dictionaries/dict-form.tsx`
  - `src/app/admin/(panel)/factories/page.tsx` (siyahı), `.../factories/new/page.tsx`, `.../factories/[id]/page.tsx`, `.../factories/actions.ts`, `.../factories/factory-form.tsx`
  - `src/features/factories/admin.ts`, `tests/unit/factories-admin.test.ts`, `tests/e2e/admin-factories.spec.ts`
- Dəyiş: admin sol menyusu (`(panel)/layout.tsx`: "Zavodlar", "Lüğətlər"), `tests/e2e/admin-auth.spec.ts` (yeni bölmələr girişsiz `/admin/login`-ə)

**İnterfeyslər — verir:**
- `factoryFormSchema` (zod, Azərbaycanca mesajlar):
  - `type` (FACTORY_TYPES), `name` 2–120, `slug` (boşdursa addan), `about` ≤ 400;
  - `industryId` / `productTypeId` / `cityId` (int | null), `productionModelIds` int[], `cooperation` (COOPERATION[]);
  - `verified`, `status`, `tariffCode` (standart|premium|vip), `tariffUntil` (tarix | null).
- `tariffRankOf(code: string, until: Date | null, now = new Date()): 0 | 1 | 2`: `standart` və ya bitmiş tarix → 0.
- `dictFormSchema`: `slug` `^[a-z0-9-]{1,80}$`, `name.az` məcburi (1–80), `en`/`ru` ≤ 80, `sort` int.

**Davranış:**
- **Lüğətlər:** 4 lüğətin hər biri üçün siyahı (ad AZ, slug, sıra, istifadə sayı), əlavə et və redaktə et (3 dil ad, slug, sıra).
  - Silmə yalnız heç bir zavod istifadə etmirsə mümkündür; əks halda "Bu dəyər N zavodda istifadə olunur" mesajı.
  - Şəhər slug-ı sahə slug-ı ilə və ya əksinə toqquşursa → xəta.
  - Saxlayanda `invalidateTags([DICTIONARIES_TAG, FACTORIES_TAG])`.
- **Zavodlar siyahısı:**
  - ad üzrə axtarış (`ilike`, `%` və `_` escape olunur);
  - tip və status filtri;
  - 50-lik səhifələmə (offset);
  - sütunlar: ad, tip, şəhər, status, təsdiq, tarif, yenilənmə tarixi.
- **Zavod formu:**
  - bütün sahələr; model və əməkdaşlıq checkbox qrupudur;
  - cover yükləmə: `<input type=file accept="image/jpeg,image/png,image/webp">`, `saveImage` ilə; xəta mesajları "Yalnız JPG, PNG və ya WebP", "Fayl 8 MB-dan böyük ola bilməz", "Şəkil oxunmadı";
  - mövcud şəklin önizləməsi və "Şəkli sil".
  - Saxlayanda:
    - slug unikallaşdırılır (`uniqueSlug`), əl ilə verilən slug tutulubsa xəta;
    - `tariffRank = tariffRankOf(...)`;
    - `invalidateTags([FACTORIES_TAG])`;
    - köhnə cover dəyişibsə, köhnə media sətri və qovluğu silinir (istifadə etməyən).
  - Xəta olsa yazılan dəyərlər itmir (1-ci addım formaları kimi).
  - Silmə yoxdur, "Gizlət" var (`status=hidden`): spec — zavod hesabı 6-cı addımda bağlanır.

- [ ] **Addım 1: Uğursuz unit:**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { tariffRankOf, factoryFormSchema } from "../../src/features/factories/admin.ts";

test("tariff rank: vip 2, premium 1, standart/expired 0", () => {
  const now = new Date("2026-11-17T12:00:00Z");
  assert.equal(tariffRankOf("vip", new Date("2026-12-01"), now), 2);
  assert.equal(tariffRankOf("premium", null, now), 1);
  assert.equal(tariffRankOf("premium", new Date("2026-11-01"), now), 0);
  assert.equal(tariffRankOf("standart", null, now), 0);
});

test("factory form: Azerbaijani messages, about ≤ 400, unknown type rejected", () => {
  const r = factoryFormSchema.safeParse({ type: "x", name: "A", about: "a".repeat(401) });
  assert.equal(r.success, false);
  const msgs = r.error!.issues.map((i) => i.message).join(" | ");
  assert.match(msgs, /Ən azı 2 simvol/);
  assert.match(msgs, /Ən çox 400 simvol/);
});
```

- [ ] **Addım 2: Uğursuz e2e** — `admin-factories.spec.ts`:
  - admin zavod yaradır (`sample.jpg` ilə), status "published", Premium;
  - `/kataloq`-da kart görünür, şəkil `/media/…/640.webp` 200 qaytarır;
  - `/kataloq/tovsiyye-edilenler`-də kart var;
  - status "hidden" → kataloqdan yox olur (cache yenilənib);
  - lüğətə yeni şəhər əlavə et → kataloq filtrində görünür;
  - istifadə olunan şəhəri silmək → xəta mesajı.
  - Test öz yaratdıqlarını silir (`e2e-` prefiksi və media qovluğu).
- [ ] **Addım 3:** İmplementasiya → unit + e2e yaşıl. **Commit:** `feat: admin — zavodlar (şəkil, tarif, təsdiq, status) və filtr lüğətləri`

---

### Tapşırıq 11: Yük testi seed-i və performans yoxlaması

**Fayllar:**
- Yarat: `scripts/seed/load.mts`, `scripts/perf/catalog.mts`, `docs/perf/addim-2-katalog.md` (nəticələr)
- Dəyiş: `package.json` (`db:seed-load`, `perf:catalog`)

**Davranış:**
- `db:seed-load -- --count 20000`:
  - yalnız `DATABASE_URL` bazası `zavod_load` olanda işləyir, əks halda `throw` ("yük seed-i yalnız zavod_load bazasında");
  - bazanı yaradır (yoxdursa, `create database`), miqrasiyaları işlədir, lüğətləri seed edir;
  - deterministik RNG (`mulberry32(42)`) ilə zavodlar yaradılır:
    - tip, şəhər, sahə, məhsul tipi bərabər paylanır;
    - 0–3 model, 0–2 əməkdaşlıq;
    - 5% VIP, 10% Premium, 60% verified, 85% published;
    - reytinq 0–5;
    - `createdAt` son 3 ilə yayılır;
    - cover yoxdur.
  - Partiyalarla yazılır (1000-lik `insert`).
- `perf:catalog`:
  - eyni bazada 12 tipik sorğunu `EXPLAIN (ANALYZE, BUFFERS)` ilə işlədir: default səhifə 1 və 50, tip, tip+şəhər, model, coop, `rating_desc`, tövsiyə, landing, say sorğuları;
  - hər birinin vaxtını və indeks istifadəsini çap edir;
  - hədəf: hər sorğu ≤ 50 ms (spec §6.1 TTFB hədəfinə uyğun, cache-siz soyuq sorğu), seq scan yoxdur (kiçik lüğət cədvəlləri xaric);
  - hədəf keçmirsə, indeks əlavə olunur (yeni miqrasiya) və təkrarlanır.
- Nəticələr cədvəli `docs/perf/addim-2-katalog.md`-ə yazılır.

- [ ] **Addım 1:** `zavod_load` URL-i: `DATABASE_URL`-in bazası dəyişdirilir, `.env.local`-da `LOAD_DATABASE_URL` kimi (sirri çap etmə). Seed → 20 000 zavod.
- [ ] **Addım 2:** `npm run perf:catalog` → nəticələr, lazım olsa indeks düzəlişi.
- [ ] **Addım 3:** E2E deyil, amma skriptin "zavod_load deyilsə imtina" davranışı üçün kiçik unit test (`assertLoadDb(url)` saf funksiyası).
- [ ] **Addım 4: Commit:** `test: 20 000 zavodla yük seed-i və kataloq sorğularının performans yoxlaması`

---

### Tapşırıq 12: Figma ilə yoxlama (həndəsə + vizual) — kataloq, tip, tövsiyə, mobil filtr

**Fixture:**
- `scripts/seed/figma-fixture.mts` (`npm run db:seed-figma`) yalnız lokal bazada işləyir (`localhost` yoxlaması).
- Slug prefiksi `figma-` olan zavodları silir, sonra Figma-dakı 15 kartı Figma sırası ilə yaradır:
  - ad "Lorem ipsum dolor", təsvir Figma mətni;
  - tiplər Figma kartlarındakı kimi (KOMBİNAT, FABRİK, … `figma:inspect 281:7097` ilə sırala);
  - hamısı verified, reytinq 3.5, VIP;
  - `createdAt` elə sıralanır ki, default sırada ilk 15 olsunlar.
- Üstəlik 135 "doldurucu" zavod yaradılır (standart, köhnə tarix), beləliklə səhifələmə "1 2 3 … 10" olur.
- Kart şəkilləri Figma-dakı IMAGE fill-lərdir. `npm run figma:assets` (şəkil API-si) ilə və ya API limitdədirsə controller brauzerdən export edir → `design/manual-export/catalog/` → fixture `saveImage` ilə yükləyir.

**Hədəflər** (`tests/visual/targets.json`; `path` + `selector`; fixture seed-dən sonra):

| name | bp | node | path | qeyd |
|---|---|---|---|---|
| catalog | desktop | `273:6507` | `/kataloq` | breadcrumb + başlıq + filtr + qrid + səhifələmə |
| catalog-filter-open | desktop | `283:9156`-ın filtr paneli | `/kataloq` | `open`: "İstehsal sahəsi" dropdown-u; Figma "Category 1..4" → lüğət dəyərləri `aliases` |
| zavodlar | desktop | `299:7693` məzmun bloku | `/zavodlar` | fixture-da zavod tipləri — inspect et |
| recommended | desktop | `449:14061` məzmun bloku | `/kataloq/tovsiyye-edilenler` | |
| catalog-top | mobile | `736:23855` + `736:23868`-in yuxarısı (başlıq, Filtr düyməsi, ilk kart) | `/kataloq` | split hədəflər, 1-ci addımdakı kimi |
| catalog-pagination | mobile | mobil səhifələmə frame-i | `/kataloq` | |
| filter-list | mobile | `737:22004` | `/kataloq` | `open`: Filtr düyməsi |
| filter-type, filter-city … | mobile | `758:22171` … `761:22772` | `/kataloq` | `open`: düymə + sətir (`targets.json`-da `open` massiv kimi; lazım olsa `capture.mjs` dəstəyi + unit test) |

- [ ] **Addım 1:** Referanslar: `npm run figma:references`. 429 verərsə, **dayan və controller-ə bildir**: controller brauzerdən export edir.
- [ ] **Addım 2:** `npm run db:seed-figma && npm run build && npx next start -p 3100`, sonra `npm run visual:check`. Uğursuz hədəflərdə CSS `figma:inspect` dəyərləri ilə düzəldilir. Vizual 2.5%-i keçən, sıx mətnli və ya qəsdən fərqli hədəf olarsa, səbəb + ölçülən dəyər controller-ə bildirilir; `maxDiff`-i controller təsdiqləyir.
- [ ] **Addım 3:** Tam testlər: `typecheck`, `lint`, `test:unit`, `test:e2e`, `visual:check`. 1-ci addımın 23 hədəfi də keçməlidir.
- [ ] **Addım 4: Commit:** `test: 2-ci addım səhifələri Figma ilə yoxlanılır (həndəsə ±1px, vizual)`

---

## Addım 2 bitdi sayılır, əgər:

- [ ] `/kataloq`, 6 tip səhifəsi, Tövsiyə edilənlər və landing-lər 3 dildə açılır. Filtrlər işləyir (JS ilə və JS-siz), sıralama VIP→Premium→digər (və reytinq üzrə), səhifələmə və boş hal düzgündür.
- [ ] Mobil filtr dialoqu Figma ekranları ilə işləyir və ilk yüklənmədə JS-ə düşmür.
- [ ] SEO:
  - indekslənən səhifələrin canonical/hreflang-i düzgündür;
  - filtr URL-ləri `noindex, follow`-dur;
  - `BreadcrumbList` + `ItemList` var;
  - sitemap-də kataloq, tip, tövsiyə və dolu landing-lər var.
- [ ] Admin: zavod əlavə et/redaktə et (şəkil, tarif, təsdiq, status), lüğətlər (3 dil, slug toqquşması, istifadədə olanı silmə qadağası). Hər dəyişiklik kataloqda dərhal görünür.
- [ ] Şəkillər WebP variantları ilə `/media/...`-dan immutable cache ilə gəlir.
- [ ] 20 000 zavodla bütün kataloq sorğuları ≤ 50 ms, nəticələr `docs/perf/`-dədir.
- [ ] `npm run visual:check`: 2-ci addımın bütün hədəfləri + 1-ci addımın 23 hədəfi keçir.
- [ ] typecheck, lint, unit, tam E2E yaşıldır. JS büdcəsi ≤ 150 KB, öz kodumuz ≤ 15 KB.
