# Addım 1 — Statik səhifələr və Əlaqə forması: icra planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Məqsəd:** İstifadəçi qaydaları, Məxfilik siyasəti, Yardım (FAQ), Tariflər və Əlaqə səhifələri 3 dildə, Figma ilə 1:1 (həndəsə ±1px + vizual ≤2.5%), məzmunu admin paneldən idarə olunan; Əlaqə forması işləyir (baza + email + spam qoruması); "İndi qoşul" düyməsi istifadəçinin vəziyyətinə görə düzgün yerə aparır.

**Arxitektura:** Hər səhifənin məzmunu bazadadır (`pages`, `faq_items`, `tariff_plans`, `site_settings.contact`), oxunuşlar `use cache` + `cacheTag` ilə cache-lənir və admin saxlayanda `invalidateTags` ilə yenilənir (addım 0-dakı settings nümunəsi). Hüquqi mətnlər Tiptap JSON kimi saxlanılır və öz təhlükəsiz renderer-imizlə (HTML inject yoxdur) göstərilir. Səhifələr statikdir (SSG); yeganə dinamik hissələr Əlaqə Server Action-ı və `/api/join` yönləndirməsidir.

**Texnologiyalar:** addım 0 ilə eyni + `nodemailer` (email), `@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-link` (yalnız admin).

**Spec:** [02-spec.md](02-spec.md) · Figma inventarı: [01-figma-analiz.md](01-figma-analiz.md) · Addım 0 planı: [03-addim-0-temel-plan.md](03-addim-0-temel-plan.md)

## Ümumi qaydalar (hər tapşırığa aiddir)

- UI Figma ilə 1:1. **Hər səhifə hissəsi iki yoxlamanı keçməlidir** (spec §1.1 bənd 6): (a) həndəsə — hissənin ölçüsü Figma frame-i ilə eyni, hər görünən Figma mətninin x/y/hündürlüyü ±1px; (b) vizual — pixelmatch ≤ 2.5%. Əmr: `npm run visual:check`. Referansları dəyişmək, həddi boşaltmaq, elementi gizlətmək qadağandır.
- Dəqiq ölçülər `npm run figma:inspect -- <node-id> [depth]` ilə götürülür (gözlə ölçülmür). Figma API-nin `/files` və şəkil endpoint-ləri ~2026-11-16-ya qədər limitdədir; `/nodes` işləyir. Tam faylı yükləmə — `design/.cache/file.json` (2026-11-11 nüsxəsi) istifadə et.
- Rəng və text style yalnız `src/styles/tokens.css`-dən; Figma-dakı xam px dəyərləri `[..px]` kimi yazıla bilər.
- `< 1024px` mobil (Figma 320), `≥ 1024px` desktop (Figma 1440). Mətn qutularına sabit `h-*` yox, `min-h-*` + uyğun `leading-*` (EN/RU uzun mətnlər böyüyə bilsin). Klik/toxunma sahəsi ≥ 44px.
- Dillər: AZ prefikssiz, `/en`, `/ru`. İstifadəçi mətnləri lüğətdən və ya bazadan; bazada boş qalan EN/RU dəyəri AZ-a düşür (fallback).
- Client komponentlər zod və server modullarını import etmir (JS büdcəsi < 100 KB). Tiptap yalnız `/admin` altında.
- Hər admin səhifəsi və admin action `requireAdmin()`-i özü çağırır (R15). Hər yazmadan sonra uyğun cache teqi `invalidateTags` ilə yenilənir.
- Hər tapşırıq: TDD (əvvəl uğursuz test), sonra `npm run typecheck && npm run lint && npm run test:unit`, E2E olanlarda `npm run build && npm run test:e2e` (port 3100 boş olsun). Commit mesajı Azərbaycanca, sonunda boş sətir + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Playwright sistem Chrome-u ilə işləyir (`channel: "chrome"`). Lokal baza: Docker, `localhost:5442`; Mailpit SMTP `localhost:1027`, API/UI `http://localhost:8027`.

## İstifadəçinin qərarları (2026-11-12)

| Mövzu | Qərar |
|---|---|
| Əlaqə "Mövzu" seçimləri | Əməkdaşlıq · Paket ödənişləri · Reklam · Digər (admin dəyişə bilir) |
| Əlaqə mesajları | Admin panel + email bildiriş (ünvanlar admin-dən) |
| Hüquqi mətn redaktoru | Vizual redaktor (Tiptap): başlıq, qalın/kursiv, siyahı, link |
| "İndi qoşul" | Daxil olmuş zavod → kabinet/Tariflər; hesabı olan, amma daxil olmayan → Daxil ol; hesabı olmayan → Qeydiyyat |

## Controller qərarları

- Reklam banneri (hər səhifədə məzmun ilə footer arası, 240px) **5-ci addımda** əlavə olunur; bu addımda səhifələr bannersiz qurulur (məzmun → footer arası Figma-dakı 120px qalır).
- Əlaqə Figma mətnindəki "Fabrik.az" səhv sayılır → "Zavod.az". Həndəsə yoxlamasında bu fərq `aliases` ilə qeyd olunur.
- Figma-da Əlaqə səhifəsindəki telefon placeholder-i (`+994 00 000 00 00`) header-dəkindən (`+994 000 00 00`) fərqlidir; sayt hər yerdə bir telefonu (sayt ayarları) göstərir → `aliases`.
- Əlaqə uğur pəncərəsi Figma-dakı "Qəbul olundu!" popup-unun (`244:9480` frame-i içində) dizaynı ilə qurulur, mətni Əlaqəyə uyğunlaşdırılır.
- İkonlar Figma-nın `/nodes?geometry=paths` cavabındakı vektor konturlarından SVG-yə çevrilir (şəkil API-si bloklu olduğu üçün) — dəqiq Figma konturları, kitabxana yox.
- "Hesabı var" anlayışı: zavod uğurla daxil olanda brauzerə `zv_known=1` cookie-si yazılır (1 il, şəxsi məlumatsız; yazılması 6-cı addımda). `/api/join` bu cookie-yə baxır.
- Seed (ilkin) məzmun Figma-dakı mətnlərdir (yalnız AZ; EN/RU boş → AZ fallback), ki həndəsə/vizual yoxlama keçsin. Real məzmunu admin yazacaq.

---

## Fayl xəritəsi

```
scripts/
  figma/export-icons.mts            Figma vektor konturlarından SVG (yeni)
  seed/content.mts                  pages, faq, tariffs, contact ayarlarının ilkin məzmunu (yeni)
src/
  db/schema.ts                      + pages, faq_items, tariff_plans, contact_messages
  features/
    pages/{types.ts,queries.ts,actions.ts,defaults.ts}
    faq/{queries.ts,actions.ts}
    tariffs/{format.ts,queries.ts,actions.ts,join.ts}
    contact/{schema.ts,settings.ts,queries.ts,actions.ts}
  lib/
    mail.ts                         nodemailer (SMTP yoxdursa log + keç)
    rich-text.tsx                   Tiptap JSON → React (təhlükəsiz)
    structured-data.tsx             JSON-LD (BreadcrumbList, FAQPage)
  components/
    page/{page-shell.tsx,breadcrumb.tsx,legal-nav.tsx}
    ui/{button.tsx,field.tsx,textarea-field.tsx,select-field.tsx,modal.tsx}
    tariffs/tariff-card.tsx
    contact/{contact-info.tsx,contact-form.tsx}
    faq/faq-list.tsx
  app/
    [lang]/{terms,privacy,help,tariffs,contact}/page.tsx
    api/join/route.ts
    sitemap.ts
    admin/(panel)/pages/…, faq/…, tariffs/…, contact/…, submissions/…
    admin/_components/rich-text-editor.tsx   (client, Tiptap)
tests/
  unit/{rich-text,tariffs,join,contact}.test.ts
  e2e/{static-pages,tariffs,contact,admin-content}.spec.ts
  visual/{geometry.mjs,targets.json}         (genişlənir)
```

---

### Tapşırıq 1: Figma vektorlarından ikonlar

**Fayllar:**
- Yarat: `scripts/figma/export-icons.mts`, `public/icons/{check-circle,caret-up,caret-down-brand,asterisk,diamonds-four,crown-simple,phone-24,envelope-simple,social-light-*}.svg`
- Dəyiş: `package.json` (script `figma:icons`), `src/components/ui/icon.tsx` (yeni adlar)

**İnterfeyslər:**
- İstifadə edir: `getNodes` (`scripts/figma/api.mts`)
- Verir: `IconName` yeni adlarla: `"check-circle" | "caret-up" | "caret-down-brand" | "asterisk" | "diamonds-four" | "crown-simple" | "phone-24" | "envelope-simple"`; `SocialIcon` üçün `variant?: "dark" | "light"` (light = Əlaqə səhifəsinin açıq dairələri, 44 desktop / 40 mobil).

İkon node-ları (Figma `1:1` səhifəsi, 2026-11-11):

| Ad | Node | Ölçü | Qeyd |
|---|---|---|---|
| check-circle | `157:2324` | 20 | tarif xüsusiyyəti |
| caret-up | `I153:4344;153:4307` | 20 | FAQ açıq |
| caret-down-brand | `I153:4349;153:4303` | 20 | FAQ bağlı (rəng `brand-500`, header-dəki caret-down-dan fərqli) |
| asterisk | `157:2317` | 28 | Standart |
| diamonds-four | `157:2339` | 28 | Premium |
| crown-simple | `157:2374` | 28 | VİP |
| phone-24 | `153:4629` | 24 | Əlaqə |
| envelope-simple | `153:4635` | 24 | Əlaqə |
| social-light-{facebook,instagram,linkedin,x,youtube,tiktok} | `560:15595`, `560:15597`, `560:15599`, `560:15601`, `560:15609`, `560:15611` | 44 | dairə + glyph |

CaretRight (18/24) və WhatsApp (24/30) mövcud SVG-lərin (`caret-right.svg`, `whatsapp.svg`) miqyaslanmasıdır — yeni export lazım deyil. Hər yeni node-u əvvəlcə `figma:inspect` ilə yoxla (ad, ölçü, görünürlük).

- [ ] **Addım 1: `scripts/figma/export-icons.mts`**

```ts
// Builds SVG icons from Figma vector geometry (/nodes?geometry=paths) — exact Figma outlines,
// no image-render API needed. Supports what our icons use: frames with a solid fill and
// corner radius (circle backgrounds) and vectors / boolean shapes with solid fills.
//   npm run figma:icons
import { mkdir, writeFile } from "node:fs/promises";
import { FILE_KEY } from "./api.mts";

type Paint = { type: string; visible?: boolean; opacity?: number; color?: { r: number; g: number; b: number; a: number } };
type Geo = { path: string; windingRule: "NONZERO" | "EVENODD" };
type Node = {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  absoluteBoundingBox: { x: number; y: number; width: number; height: number };
  relativeTransform?: [[number, number, number], [number, number, number]];
  fills?: Paint[];
  fillGeometry?: Geo[];
  cornerRadius?: number;
  children?: Node[];
};

export const ICONS: Record<string, string> = {
  "check-circle": "157:2324",
  "caret-up": "I153:4344;153:4307",
  "caret-down-brand": "I153:4349;153:4303",
  asterisk: "157:2317",
  "diamonds-four": "157:2339",
  "crown-simple": "157:2374",
  "phone-24": "153:4629",
  "envelope-simple": "153:4635",
  "social-light-facebook": "560:15595",
  "social-light-instagram": "560:15597",
  "social-light-linkedin": "560:15599",
  "social-light-x": "560:15601",
  "social-light-youtube": "560:15609",
  "social-light-tiktok": "560:15611",
};

const hex = (p: Paint) => {
  const c = p.color!;
  const h = "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
  const a = (p.opacity ?? 1) * c.a;
  return a < 1 ? `${h}" fill-opacity="${+a.toFixed(3)}` : h;
};
const solid = (n: Node) => (n.fills ?? []).find((f) => f.visible !== false && f.type === "SOLID");

/** One <path> per fill geometry, placed by the node's offset inside the icon frame. */
function shapes(n: Node, root: Node): string[] {
  if (n.visible === false) return [];
  const dx = +(n.absoluteBoundingBox.x - root.absoluteBoundingBox.x).toFixed(4);
  const dy = +(n.absoluteBoundingBox.y - root.absoluteBoundingBox.y).toFixed(4);
  const out: string[] = [];
  const fill = solid(n);
  if (n !== root && fill && n.fillGeometry?.length) {
    for (const g of n.fillGeometry) {
      out.push(`<path transform="translate(${dx} ${dy})" fill-rule="${g.windingRule === "EVENODD" ? "evenodd" : "nonzero"}" fill="${hex(fill)}" d="${g.path}"/>`);
    }
    return out; // vector / boolean: children are already merged into its geometry
  }
  for (const c of n.children ?? []) out.push(...shapes(c, root));
  return out;
}

function toSvg(root: Node): string {
  const { width: w, height: h } = root.absoluteBoundingBox;
  const bg = solid(root);
  const rect = bg ? `<rect width="${w}" height="${h}" rx="${Math.min(root.cornerRadius ?? 0, w / 2, h / 2)}" fill="${hex(bg)}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">${rect}${shapes(root, root).join("")}</svg>\n`;
}

const token = process.env.FIGMA_TOKEN;
if (!token) throw new Error("FIGMA_TOKEN is not set (.env.local)");
const ids = Object.values(ICONS);
const res = await fetch(
  `https://api.figma.com/v1/files/${FILE_KEY}/nodes?geometry=paths&ids=${encodeURIComponent(ids.join(","))}`,
  { headers: { "X-Figma-Token": token } },
);
if (!res.ok) throw new Error(`Figma /nodes: ${res.status} ${await res.text()}`);
const { nodes } = (await res.json()) as { nodes: Record<string, { document: Node } | null> };

await mkdir("public/icons", { recursive: true });
for (const [name, id] of Object.entries(ICONS)) {
  const node = nodes[id]?.document;
  if (!node) throw new Error(`Figma node not found: ${name} (${id}) — update the id with figma:inspect`);
  await writeFile(`public/icons/${name}.svg`, toSvg(node));
  console.log(`public/icons/${name}.svg  ${node.absoluteBoundingBox.width}×${node.absoluteBoundingBox.height}`);
}
```

`package.json` → `"figma:icons": "node --env-file-if-exists=.env.local --import tsx scripts/figma/export-icons.mts"`.

- [ ] **Addım 2: İşlət və yoxla**

```bash
npm run figma:icons
```

Gözlənilən: 14 fayl. Hər SVG-ni brauzerdə aç və Figma ilə gözlə müqayisə et (forma, rəng). **Vektor offset-i yoxla:** `figma:inspect` ilə node-un `relativeTransform`-unda fırlanma (0-dan fərqli `[0][1]`/`[1][0]`) varsa, `translate` kifayət deyil — o halda `transform="matrix(a b c d e f)"` istifadə et (relativeTransform-dan), sonra yenidən işlət. Mövcud `public/icons/phone.svg` (images API-dən) ilə `phone-24.svg`-ni eyni ölçüdə göstərib piksel fərqini müqayisə et (`sharp` ilə rasterləşdir, `pixelmatch` ilə ≤ 1%) — bu, exporter-in düzgünlüyünün sübutudur; nəticəni report-a yaz.

- [ ] **Addım 3: `src/components/ui/icon.tsx` — yeni adlar**

`IconName` birləşməsinə cədvəldəki 8 adı əlavə et. `SocialIcon`-a variant:

```tsx
export function SocialIcon({ name, variant = "dark", size }: { name: SocialName; variant?: "dark" | "light"; size?: number }) {
  const file = variant === "light" ? `social-light-${name}` : `social-${name}`;
  const px = size ?? (variant === "light" ? 44 : 40);
  // eslint-disable-next-line @next/next/no-img-element -- static SVG from Figma
  return <img src={`/icons/${file}.svg`} width={px} height={px} alt="" aria-hidden />;
}
```

- [ ] **Addım 4: Commit**

```bash
npm run typecheck && npm run lint
git add scripts/figma/export-icons.mts package.json public/icons src/components/ui/icon.tsx
git commit -m "feat: Figma vektor konturlarından ikonlar (1-ci addım səhifələri üçün)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 2: Həndəsə yoxlamasının genişləndirilməsi

**Fayllar:**
- Dəyiş: `tests/visual/geometry.mjs`, `tests/visual/targets.json` (sxem), `tests/visual/capture.mjs` (yeni sahə dəstəyi)

**İnterfeyslər:**
- Verir: `targets.json` elementinə iki könüllü sahə:
  - `"aliases": { "<Figma mətni>": "<saytdakı mətn>" }` — bilərəkdən fərqli placeholder-lər üçün (hər alias-ın səbəbi report-da yazılır).
  - `"minTexts": <number>` — hədəfdə ən azı neçə Figma mətni olmalıdır (boş nəticə ilə "keçmə"nin qarşısını alır; addım 0 yekun rəyindəki minor).
  - `"waitFor"`: (könüllü) capture/geometry-dən əvvəl gözlənilən selector.

- [ ] **Addım 1: Çoxparaqraflı mətnlər**

Figma-da bir TEXT node-u `\n` ilə bir neçə paraqraf saxlaya bilər (hüquqi mətnlər), saytda isə bunlar ayrı `<p>`-lərdir. `geometry.mjs`-də: Figma mətni `\n` ehtiva edirsə, saytda elə **konteyner** axtar ki, onun `innerText`-i (bütün boşluqlar tək boşluğa endirilmiş) Figma mətninin eyni normallaşdırılmış formasına bərabər olsun; müqayisə konteynerin qutusu ilə aparılır (x, y, hündürlük ±1px). Tək sətirli mətnlər üçün mövcud davranış dəyişmir.

- [ ] **Addım 2: `aliases` və `minTexts`**

- Uyğunlaşdırmadan əvvəl `aliases[figmaText] ?? figmaText` istifadə et; cədvəldə alias istifadə olunubsa `(alias)` qeydi göstər.
- Hədəfdə tapılan görünən Figma mətnlərinin sayı `minTexts`-dən azdırsa → hədəf uğursuz ("expected ≥ N Figma texts, got M — wrong node id?"). `minTexts` verilməyibsa, 1 qəbul et; mətnsiz hədəflər (mobil header) üçün `"minTexts": 0` açıq yazılır — `targets.json`-da mobil header-ə əlavə et.

- [ ] **Addım 3: Yoxla**

```bash
npm run build && (npx next start -p 3100 &) && npm run visual:check
```

Gözlənilən: addım 0-ın 5 hədəfi əvvəlki kimi keçir (dəyişiklik regresiya yaratmır). Serveri dayandır.

- [ ] **Addım 4: Commit**

```bash
git add tests/visual
git commit -m "test: həndəsə yoxlaması — çoxparaqraflı mətn, alias-lar, minimum mətn sayı

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 3: Məzmun cədvəlləri, sorğular və ilkin məzmun

**Fayllar:**
- Dəyiş: `src/db/schema.ts`; generasiya: `drizzle/0001_*.sql`
- Yarat: `src/features/pages/{types.ts,defaults.ts,queries.ts}`, `src/features/faq/queries.ts`, `src/features/tariffs/{format.ts,queries.ts}`, `src/features/contact/{settings.ts,queries.ts}`, `scripts/seed/content.mts`, `tests/unit/tariffs.test.ts`, `tests/unit/contact.test.ts` (yalnız settings hissəsi)
- Dəyiş: `package.json` (`db:seed-content`), `tests/e2e/global-setup.ts` (seed-content əlavə), `src/lib/cache/tags.ts` (teq sabitləri)

**İnterfeyslər:**
- İstifadə edir: `db`, `siteSettings`, `Localized`, `locales`, `invalidateTags`
- Verir:
  - Cədvəllər: `pages`, `faqItems`, `tariffPlans`, `contactMessages`
  - `type RichDoc = { type: "doc"; content?: RichNode[] }`, `type RichNode = { type: string; attrs?: Record<string, unknown>; content?: RichNode[]; text?: string; marks?: { type: string; attrs?: Record<string, unknown> }[] }`
  - `type PageKey = "terms" | "privacy" | "help" | "tariffs" | "contact"`
  - `getPage(key: PageKey): Promise<PageContent>` — `PageContent = { key; title: Localized; intro: Localized; body: Localized<RichDoc | null>; seo: { title: Localized; description: Localized } }`
  - `pick(value: Localized, lang: Locale): string` — boş dildə AZ fallback
  - `getFaq(): Promise<FaqItem[]>` — `FaqItem = { id: string; question: Localized; answer: Localized; sort: number }` (yalnız `published`)
  - `getTariffs(): Promise<TariffPlan[]>` — `TariffPlan = { code: "standart" | "premium" | "vip"; icon: "asterisk" | "diamonds-four" | "crown-simple"; name: Localized; priceMonthQ: number; priceYearQ: number | null; features: Localized<string[]>; limits: { products: number | null; vacancies: number | null }; sort: number }`
  - `formatPrice(qepik: number): string` → `"7.99₼"`, `formatPrice(8600)` → `"86₼"`
  - `getContactSettings(): Promise<ContactSettings>` — `ContactSettings = { topics: { id: string; label: Localized }[]; notifyEmails: string[] }`; `defaultContactSettings`; `mergeContactSettings(stored: unknown): ContactSettings`
  - Teqlər: `pageTag(key)` = `` `page:${key}` ``, `FAQ_TAG = "faq"`, `TARIFFS_TAG = "tariffs"`, `CONTACT_TAG = "contact"`

- [ ] **Addım 1: Uğursuz testlər**

`tests/unit/tariffs.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPrice } from "../../src/features/tariffs/format.ts";

test("formatPrice writes AZN like Figma", () => {
  assert.equal(formatPrice(799), "7.99₼");
  assert.equal(formatPrice(999), "9.99₼");
  assert.equal(formatPrice(8600), "86₼");
  assert.equal(formatPrice(8650), "86.50₼");
  assert.equal(formatPrice(0), "0₼");
});
```

`tests/unit/contact.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultContactSettings, mergeContactSettings } from "../../src/features/contact/settings.ts";

test("default topics are the user's list", () => {
  assert.deepEqual(defaultContactSettings.topics.map((t) => t.label.az), ["Əməkdaşlıq", "Paket ödənişləri", "Reklam", "Digər"]);
});

test("broken stored settings fall back to defaults", () => {
  assert.deepEqual(mergeContactSettings({ topics: "x" }), defaultContactSettings);
  assert.deepEqual(mergeContactSettings(undefined), defaultContactSettings);
});

test("stored notify emails are kept", () => {
  const s = mergeContactSettings({ ...defaultContactSettings, notifyEmails: ["info@zavod.az"] });
  assert.deepEqual(s.notifyEmails, ["info@zavod.az"]);
});
```

Run: `npm run test:unit` → FAIL (modullar yoxdur).

- [ ] **Addım 2: Sxem** — `src/db/schema.ts`-ə əlavə et (mövcud `timestamps` köməkçisini istifadə et):

```ts
import type { Localized } from "@/i18n/config";
import type { RichDoc } from "@/features/pages/types";

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
```

```bash
npm run db:generate && npm run db:migrate
```

- [ ] **Addım 3: `src/features/pages/types.ts`**

```ts
import type { Localized } from "@/i18n/config";

export type RichMark = { type: string; attrs?: Record<string, unknown> };
export type RichNode = { type: string; attrs?: Record<string, unknown>; content?: RichNode[]; text?: string; marks?: RichMark[] };
export type RichDoc = { type: "doc"; content?: RichNode[] };

export type PageKey = "terms" | "privacy" | "help" | "tariffs" | "contact";
export const PAGE_KEYS: PageKey[] = ["terms", "privacy", "help", "tariffs", "contact"];

export type PageContent = {
  key: PageKey;
  title: Localized;
  intro: Localized;
  body: Localized<RichDoc | null>;
  seo: { title: Localized; description: Localized };
};
```

- [ ] **Addım 4: Ümumi köməkçi və teqlər**

`src/i18n/config.ts`-ə əlavə et:

```ts
/** Value in the requested language, falling back to AZ when that language is empty. */
export function pick(value: Localized, lang: Locale): string {
  return value[lang]?.trim() ? value[lang] : value.az;
}
```

`src/lib/cache/tags.ts`-ə əlavə et:

```ts
export const pageTag = (key: string) => `page:${key}`;
export const FAQ_TAG = "faq";
export const TARIFFS_TAG = "tariffs";
export const CONTACT_TAG = "contact";
```

- [ ] **Addım 5: `src/features/pages/defaults.ts` və `queries.ts`**

`defaults.ts` — hər `PageKey` üçün `PageContent` (yalnız `az` dolu, `en`/`ru` boş string / `null`). Mətnlər **Figma-dan hərfi** götürülür (`design/.cache/file.json`, `findNode` ilə):

| Səhifə | `title.az` | `intro.az` | `body.az` |
|---|---|---|---|
| terms | node `143:4003` | "" | node `153:4052`-nin ilk uşağı (TEXT) — `\n`-lə bölünən hər hissə ayrıca `paragraph` |
| privacy | node `153:4074` səhifəsinin başlıq mətni (inspect et) | "" | eyni prinsip |
| help | node `153:4187` | "" | `null` |
| tariffs | node `157:2117` | node `157:2116`-nın ikinci TEXT-i | `null` |
| contact | node `153:4624` | node `153:4625` mətni, "Fabrik.az" → "Zavod.az" | `null` |

`seo.title.az` = `"<başlıq> | Zavod.az"`, `seo.description.az` = intro varsa onun ilk 155 simvolu (söz sərhədində), yoxdursa boş.

Mətnləri əl ilə köçürmə: kiçik köməkçi skript (repo-dan kənarda, commit olunmur) `design/.cache/file.json`-dan node-ları oxuyub JSON çap etsin; çıxışı `defaults.ts`-ə literal kimi yapışdır.

`queries.ts`:

```ts
import "server-only";
import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { pageTag } from "@/lib/cache/tags";
import { defaultPages } from "./defaults";
import type { PageContent, PageKey } from "./types";

/** Cached until an admin saves the page (invalidateTags([pageTag(key)])). Missing row → seeded defaults. */
export async function getPage(key: PageKey): Promise<PageContent> {
  "use cache";
  cacheLife("max");
  cacheTag(pageTag(key));
  const [row] = await db.select().from(pages).where(eq(pages.key, key)).limit(1);
  return row ? { ...row, key } : defaultPages[key];
}
```

- [ ] **Addım 6: FAQ, tariflər, əlaqə ayarları sorğuları**

`src/features/faq/queries.ts`:

```ts
import "server-only";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { faqItems } from "@/db/schema";
import { FAQ_TAG } from "@/lib/cache/tags";
import type { Localized } from "@/i18n/config";

export type FaqItem = { id: string; question: Localized; answer: Localized; sort: number };

export async function getFaq(): Promise<FaqItem[]> {
  "use cache";
  cacheLife("max");
  cacheTag(FAQ_TAG);
  return db
    .select({ id: faqItems.id, question: faqItems.question, answer: faqItems.answer, sort: faqItems.sort })
    .from(faqItems)
    .where(eq(faqItems.published, true))
    .orderBy(asc(faqItems.sort), asc(faqItems.createdAt));
}
```

`src/features/tariffs/format.ts`:

```ts
/** 799 → "7.99₼", 8600 → "86₼" (Figma style: no space before ₼, no trailing ".00"). */
export function formatPrice(qepik: number): string {
  const manat = qepik / 100;
  return `${Number.isInteger(manat) ? manat : manat.toFixed(2)}₼`;
}
```

`src/features/tariffs/queries.ts`:

```ts
import "server-only";
import { asc } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { tariffPlans } from "@/db/schema";
import { TARIFFS_TAG } from "@/lib/cache/tags";
import type { Localized } from "@/i18n/config";

export type TariffCode = "standart" | "premium" | "vip";
export type TariffIcon = "asterisk" | "diamonds-four" | "crown-simple";
export type TariffPlan = {
  code: TariffCode;
  icon: TariffIcon;
  name: Localized;
  priceMonthQ: number;
  priceYearQ: number | null;
  features: Localized<string[]>;
  limits: { products: number | null; vacancies: number | null };
  sort: number;
};

export async function getTariffs(): Promise<TariffPlan[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TARIFFS_TAG);
  const rows = await db.select().from(tariffPlans).orderBy(asc(tariffPlans.sort));
  return rows as TariffPlan[];
}
```

`src/features/contact/settings.ts` (zod-suz, client-safe deyil — server tərəfdə istifadə olunur, amma sadə yoxlama):

```ts
import { locales, type Localized } from "@/i18n/config";

export type ContactTopic = { id: string; label: Localized };
export type ContactSettings = { topics: ContactTopic[]; notifyEmails: string[] };

const topic = (id: string, az: string, en: string, ru: string): ContactTopic => ({ id, label: { az, en, ru } });

export const defaultContactSettings: ContactSettings = {
  topics: [
    topic("cooperation", "Əməkdaşlıq", "Cooperation", "Сотрудничество"),
    topic("payments", "Paket ödənişləri", "Package payments", "Оплата пакетов"),
    topic("advertising", "Reklam", "Advertising", "Реклама"),
    topic("other", "Digər", "Other", "Другое"),
  ],
  notifyEmails: [],
};

const isLocalized = (v: unknown): v is Localized =>
  !!v && typeof v === "object" && locales.every((l) => typeof (v as Record<string, unknown>)[l] === "string");

/** Stored JSON → settings; anything malformed falls back to the defaults as a whole (logged). */
export function mergeContactSettings(stored: unknown): ContactSettings {
  if (!stored || typeof stored !== "object") return defaultContactSettings;
  const s = stored as Partial<ContactSettings>;
  const topicsOk =
    Array.isArray(s.topics) &&
    s.topics.length > 0 &&
    s.topics.every((t) => t && typeof t.id === "string" && /^[a-z0-9-]{1,40}$/.test(t.id) && isLocalized(t.label));
  const emailsOk = s.notifyEmails === undefined || (Array.isArray(s.notifyEmails) && s.notifyEmails.every((e) => typeof e === "string"));
  if (!topicsOk || !emailsOk) {
    console.error("contact settings: stored value is invalid, using defaults");
    return defaultContactSettings;
  }
  return { topics: s.topics!, notifyEmails: s.notifyEmails ?? [] };
}
```

`src/features/contact/queries.ts`:

```ts
import "server-only";
import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { CONTACT_TAG } from "@/lib/cache/tags";
import { mergeContactSettings, type ContactSettings } from "./settings";

export const CONTACT_SETTINGS_KEY = "contact";

export async function getContactSettings(): Promise<ContactSettings> {
  "use cache";
  cacheLife("max");
  cacheTag(CONTACT_TAG);
  const [row] = await db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, CONTACT_SETTINGS_KEY)).limit(1);
  return mergeContactSettings(row?.value);
}
```

- [ ] **Addım 7: `scripts/seed/content.mts` (idempotent)**

- `pages`: hər `PAGE_KEYS` üçün `defaultPages[key]` — **yalnız sətir yoxdursa** daxil et (`onConflictDoNothing`), admin dəyişikliklərini əzmə.
- `tariff_plans`: Figma dəyərləri, yoxdursa daxil et:

| code | icon | name.az | priceMonthQ | priceYearQ | limits | features.az (Figma sırası ilə) |
|---|---|---|---|---|---|---|
| standart | asterisk | Standart | 0 | null | products 1, vacancies 1 | Profil yaratmaq və əsas məlumatları yerləşdirmək · 1 Vakansiya paylaşmaq · 1 Məhsul yerləşdirmək |
| premium | diamonds-four | Premium | 799 | 8600 | products 50, vacancies 3 | Zavod profilinin SEO optimizasiyası · 3 Vakansiya paylaşmaq · 1 Məqalə yazdırmaq · Ana səhifədə “Tövsiyyə edilən zavodlar” bölməsinə əlavə olunmaq. · Podkast (ildə 1 dəfə) · 50 Məhsul yerləşdirmək |
| vip | crown-simple | VİP | 999 | null | products 200, vacancies null | Zavod profilinin tam SEO optimizasiyası və Google reklamlarına çıxış · Limitsiz vakansiya paylaşımı · 3 Məqalə yazdırmaq · Ana səhifədə xüsusi banner reklam yeri · Xəbərlər bölməsində zavod haqqında xüsusi reportaj · Podkast (ildə 2 dəfə) · 200 Məhsul yerləşdirmək |

  `features.en`/`features.ru` = `[]` (boş → AZ fallback). (VİP illik qiymət və Premium vakansiya limiti açıq suallardır, 9-cu addımda dəqiqləşir.)
- `faq_items`: tamamilə boşdursa Figma-dakı 6 sual (Yardım frame-indəki ardıcıllıqla: node `153:4344`, `153:4349`, `153:4353`, `153:4357`, `153:4361`, `153:4339`-un mətnləri; cavab — açıq halın (`153:4344`) cavab mətni hamısı üçün). `published=true`, `sort` = 0..5.
- `site_settings` `contact`: yoxdursa `defaultContactSettings`.

`package.json` → `"db:seed-content": "node --env-file-if-exists=.env.local --import tsx scripts/seed/content.mts"`. `tests/e2e/global-setup.ts`-də `db:seed-admin`-dən sonra `npm run db:seed-content`. `deploy/cpanel/README.md` addım A5-ə də `npm run db:seed-content` əlavə et.

- [ ] **Addım 8: Testləri işlət** — `npm run test:unit` → PASS. `npm run db:seed-content` iki dəfə ardıcıl → ikinci dəfə heç nə dəyişmir (sətir sayları eyni).

- [ ] **Addım 9: Commit**

```bash
npm run typecheck && npm run lint
git add src/db drizzle src/features src/i18n/config.ts src/lib/cache/tags.ts scripts/seed package.json tests deploy/cpanel/README.md
git commit -m "feat: statik səhifələr, FAQ, tariflər, əlaqə ayarları — cədvəllər, sorğular, ilkin məzmun

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 4: Ümumi səhifə komponentləri (breadcrumb, başlıq, hüquqi naviqasiya, rich text, JSON-LD)

**Fayllar:**
- Yarat: `src/lib/rich-text.tsx`, `src/lib/structured-data.tsx`, `src/components/page/{breadcrumb.tsx,page-shell.tsx,legal-nav.tsx}`, `tests/unit/rich-text.test.ts`
- Dəyiş: `src/i18n/dictionaries/{az,en,ru}.ts` (səhifə adları, breadcrumb)

**İnterfeyslər:**
- İstifadə edir: `RichDoc` (T3), `href`, `dict`, `Icon`
- Verir:
  - `<RichText doc={RichDoc | null} />` — server komponent; yalnız icazəli node-lar
  - `<JsonLd data={object} />`, `breadcrumbJsonLd(items: { name: string; url: string }[])`, `faqJsonLd(items: { question: string; answer: string }[])`
  - `<Breadcrumb lang items={{ label: string; href?: string }[]} />` (son element cari səhifə)
  - `<PageShell lang crumbs title figma="<name>">{children}</PageShell>` — `data-figma` atributu olan `<main>`; breadcrumb + `<h1>` başlıq + uşaqlar; JSON-LD BreadcrumbList daxildir
  - `<LegalNav lang active={"terms" | "privacy" | "help"} gap={16 | 20} />`

Figma ölçüləri (desktop/mobil): breadcrumb `144:4008` / `685:21532`; başlıq `143:4003` (H2 40/46) / `685:20861` (Mob/H2 24/29.76); hüquqi kart `153:4020` (380 en, pad 20, gap 16, r10, `gray-50`, 1px `gray-200`; Yardımda `153:4190` gap 20) / mobil `685:21541` (288, pad 16, gap 16). Kart elementləri: `subtitle-2` (20/26), aktiv `brand-950`, qalanlar `gray-500`, sağda CaretRight 24. Səhifə məzmunu: desktop sol sütun 880, sütunlar arası 60. **Dəqiq dəyərləri `figma:inspect` ilə yoxla.**

- [ ] **Addım 1: Uğursuz test** — `tests/unit/rich-text.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { RichText } from "../../src/lib/rich-text.tsx";

const html = (doc: unknown) => renderToStaticMarkup(RichText({ doc: doc as never }));

test("renders paragraphs, headings, lists and marks", () => {
  const out = html({
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Başlıq" }] },
      { type: "paragraph", content: [{ type: "text", text: "Qalın", marks: [{ type: "bold" }] }, { type: "text", text: " mətn" }] },
      { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Bir" }] }] }] },
    ],
  });
  assert.match(out, /<h2[^>]*>Başlıq<\/h2>/);
  assert.match(out, /<strong>Qalın<\/strong> mətn/);
  assert.match(out, /<ul[^>]*><li[^>]*><p[^>]*>Bir<\/p><\/li><\/ul>/);
});

test("links: only http(s) and mailto, external opens safely", () => {
  const bad = html({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }] });
  assert.doesNotMatch(bad, /javascript:/);
  assert.match(bad, />x</);
  const good = html({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "y", marks: [{ type: "link", attrs: { href: "https://zavod.az" } }] }] }] });
  assert.match(good, /href="https:\/\/zavod.az"/);
  assert.match(good, /rel="noopener"/);
});

test("unknown nodes and raw HTML are dropped / escaped", () => {
  const out = html({ type: "doc", content: [{ type: "iframe" }, { type: "paragraph", content: [{ type: "text", text: "<script>x</script>" }] }] });
  assert.doesNotMatch(out, /<iframe|<script>/);
  assert.match(out, /&lt;script&gt;/);
});

test("null doc renders nothing", () => {
  assert.equal(html(null), "");
});
```

Run: `npm run test:unit` → FAIL.

- [ ] **Addım 2: `src/lib/rich-text.tsx`**

```tsx
import { Fragment, type ReactNode } from "react";
import type { RichDoc, RichMark, RichNode } from "@/features/pages/types";

const SAFE_HREF = /^(https?:\/\/|mailto:)/i;

function withMarks(text: string, marks: RichMark[] = [], key: number): ReactNode {
  const content = marks.reduce<ReactNode>((child, mark) => {
    switch (mark.type) {
      case "bold":
        return <strong>{child}</strong>;
      case "italic":
        return <em>{child}</em>;
      case "link": {
        const href = String(mark.attrs?.href ?? "");
        if (!SAFE_HREF.test(href)) return child;
        const external = href.startsWith("http");
        return (
          <a href={href} className="underline" {...(external ? { target: "_blank", rel: "noopener" } : {})}>
            {child}
          </a>
        );
      }
      default:
        return child;
    }
  }, text);
  return <Fragment key={key}>{content}</Fragment>;
}

function node(n: RichNode, i: number): ReactNode {
  const kids = (n.content ?? []).map(node);
  switch (n.type) {
    case "paragraph":
      return <p key={i}>{kids}</p>;
    case "heading": {
      const level = n.attrs?.level === 3 ? 3 : 2;
      return level === 3 ? <h3 key={i}>{kids}</h3> : <h2 key={i}>{kids}</h2>;
    }
    case "bulletList":
      return <ul key={i}>{kids}</ul>;
    case "orderedList":
      return <ol key={i}>{kids}</ol>;
    case "listItem":
      return <li key={i}>{kids}</li>;
    case "hardBreak":
      return <br key={i} />;
    case "text":
      return withMarks(n.text ?? "", n.marks, i);
    default:
      return null; // unknown node types are never rendered
  }
}

/** Tiptap JSON → React elements. No HTML strings: everything is escaped by React. */
export function RichText({ doc, className }: { doc: RichDoc | null; className?: string }) {
  if (!doc?.content?.length) return null;
  return <div className={className}>{doc.content.map(node)}</div>;
}
```

Stil: `RichText`-ə Figma-dakı paraqraf stili `className` ilə verilir — `text-body-md-flat` deyil, Figma mətni `Body Text/Medium` 16/24, rəng `gray-700` (`#494C5B`); paraqraflar arası Figma-da boş sətir yoxdur (bir TEXT node-u, `\n` sətir keçidləri) → paraqraflar arası boşluq 0. Başlıq/siyahı stilləri Figma-da yoxdur: `h2` = `text-h5` + yuxarı 24px, `h3` = `text-subtitle-1-medium`, siyahı `list-disc pl-6` (spec: tokenlərdən).

- [ ] **Addım 3: `src/lib/structured-data.tsx`**

```tsx
import { siteUrl } from "@/lib/seo";

/** JSON-LD in a script tag; `<` is escaped so content can never close the tag. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />
  );
}

export const breadcrumbJsonLd = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: siteUrl + it.url })),
});

export const faqJsonLd = (items: { question: string; answer: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((q) => ({ "@type": "Question", name: q.question, acceptedAnswer: { "@type": "Answer", text: q.answer } })),
});
```

- [ ] **Addım 4: Komponentlər**

`src/components/page/breadcrumb.tsx` (server):

```tsx
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export type Crumb = { label: string; href?: string };

/** Figma 144:4008 (desktop) / 685:21532 (mobile): body-sm, gap 10, CaretRight 18; last item is the current page. */
export function Breadcrumb({ items, label }: { items: Crumb[]; label: string }) {
  return (
    <nav aria-label={label} className="flex min-h-[21px] flex-wrap items-center gap-2.5 text-body-sm">
      {items.map((c, i) => (
        <span key={c.label} className="flex items-center gap-2.5">
          {i > 0 && <Icon name="caret-right" size={18} />}
          {c.href ? (
            <Link href={c.href} className="text-gray-500">
              {c.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-brand-950">
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
```

Mobil breadcrumb Figma-da "Ana səhifə" mətnini göstərmir (yalnız CaretRight + cari səhifə, `685:21532`) — `figma:inspect` ilə yoxla; elədirsə, mobil üçün ilk elementin mətni `sr-only` olsun (ekran oxuyucu üçün qalır), ikon görünsün.

`src/components/page/page-shell.tsx` (server):

```tsx
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { href } from "@/i18n/routes";
import { JsonLd, breadcrumbJsonLd } from "@/lib/structured-data";
import { Breadcrumb } from "./breadcrumb";

type Props = { lang: Locale; title: string; currentPath: string; figma: string; children: ReactNode };

/** Breadcrumb + page title (H2 style, h1 element) + content, exactly as the Figma content frames. */
export function PageShell({ lang, title, currentPath, figma, children }: Props) {
  const t = dict(lang);
  const crumbs = [{ label: t.nav.home, href: href("home", lang) }, { label: title }];
  return (
    <main data-figma={figma} className="container-site flex flex-col gap-8 pt-5 lg:pt-[30px]">
      <JsonLd data={breadcrumbJsonLd([{ name: t.nav.home, url: href("home", lang) }, { name: title, url: currentPath }])} />
      <Breadcrumb items={crumbs} label={t.breadcrumb} />
      <h1 className="text-mob-h2 text-brand-950 lg:text-h2">{title}</h1>
      {children}
    </main>
  );
}
```

`pt-*`, `gap-*` dəyərləri Figma-dakı header → breadcrumb (desktop 30, mobil 20) və breadcrumb → başlıq → məzmun (desktop 32/32, mobil inspect) boşluqlarına görə dəqiqləşdirilir.

`src/components/page/legal-nav.tsx` (server): `terms`, `privacy`, `help` linkləri (`href(...)`), aktiv olanda `aria-current="page"` + `text-brand-950`, qalanlarda `text-gray-500`; hər sətir: mətn (`text-subtitle-2`, `flex-1`) + `Icon caret-right 24`; kart `rounded-[10px] border border-gray-200 bg-gray-50 p-4 lg:p-5`, `gap` prop-dan (`16 | 20`). Hər link `min-h-11` toxunma sahəsi (görünüşü dəyişmədən, addım 0-dakı `before:` texnikası).

Lüğətlərə əlavə et (`az`/`en`/`ru`): `breadcrumb: "Naviqasiya"/"Breadcrumb"/"Навигация"`; `pages: { terms, privacy, help, tariffs, contact }` adları (AZ: İstifadəçi qaydaları, Məxfilik siyasəti, Yardım, Tariflər, Əlaqə; EN: Terms of use, Privacy policy, Help, Pricing, Contact; RU: Правила использования, Политика конфиденциальности, Помощь, Тарифы, Контакты).

- [ ] **Addım 5: Testlər və commit**

```bash
npm run test:unit && npm run typecheck && npm run lint
git add src/lib src/components/page src/i18n tests/unit/rich-text.test.ts
git commit -m "feat: səhifə karkası — breadcrumb, başlıq, hüquqi naviqasiya, təhlükəsiz rich text, JSON-LD

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 5: İstifadəçi qaydaları, Məxfilik siyasəti, Yardım + sitemap

**Fayllar:**
- Yarat: `src/app/[lang]/{terms,privacy,help}/page.tsx`, `src/components/faq/faq-list.tsx`, `src/app/sitemap.ts`, `tests/e2e/static-pages.spec.ts`
- Dəyiş: `src/lib/seo.ts` (DB SEO dəstəyi), `src/app/robots.ts` (`sitemap` sətri)

**İnterfeyslər:**
- İstifadə edir: `getPage`, `pick`, `getFaq`, `PageShell`, `LegalNav`, `RichText`, `JsonLd`, `faqJsonLd`, `pageMetadata`
- Verir: `staticPageMetadata(key: PageKey, lang: Locale): Promise<Metadata>`

Figma: Qaydalar desktop məzmun `143:4005`, mobil `685:20709`-un məzmun hissəsi; Məxfilik `153:4077` / `685:21556`; Yardım `153:4182` / `685:21648`. FAQ elementi: bağlı `153:4349` (880×48, pad 12/16, r6, `gray-50`, mətn `body-md-flat` `brand-950`, CaretDown 20 `brand-500`), açıq `153:4344` (sual sətri + 6px boşluq + cavab bloku: eyni fon/radius/pad, mətn `body-md-flat` `gray-700`, CaretUp). Elementlər arası 16.

- [ ] **Addım 1: Uğursuz E2E** — `tests/e2e/static-pages.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test("terms page: breadcrumb, title, legal nav, body", async ({ page }) => {
  await page.goto("/istifadeci-qaydalari");
  await expect(page.getByRole("heading", { level: 1, name: "Istifadəçi qaydaları" })).toBeVisible();
  const crumb = page.getByRole("navigation", { name: "Naviqasiya" });
  await expect(crumb.getByRole("link", { name: "Ana səhifə" })).toHaveAttribute("href", "/");
  const legal = page.getByRole("navigation", { name: "Hüquqi səhifələr" });
  await expect(legal.getByRole("link", { name: "Məxfilik siyasəti" })).toHaveAttribute("href", "/mexfilik-siyaseti");
  await expect(legal.locator('[aria-current="page"]')).toHaveText(/İstifadəçi qaydaları|Istifadəçi qaydaları/);
  await expect(page.locator("main p").first()).toContainText("Sed ut perspiciatis");
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.join()).toContain('"BreadcrumbList"');
});

test("privacy page in English falls back to AZ content", async ({ page }) => {
  await page.goto("/en/privacy-policy");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("main p").first()).toBeVisible();
});

test("help page: FAQ opens and closes without JavaScript errors, FAQPage JSON-LD", async ({ page }) => {
  await page.goto("/yardim");
  const items = page.locator("main details");
  await expect(items).toHaveCount(6);
  await expect(items.first()).toHaveAttribute("open", "");
  await items.nth(1).locator("summary").click();
  await expect(items.nth(1)).toHaveAttribute("open", "");
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.join()).toContain('"FAQPage"');
});

test("sitemap lists static pages in 3 languages", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const p of ["/istifadeci-qaydalari", "/en/privacy-policy", "/ru/pomoshch", "/tarifler", "/en/contact"]) {
    expect(xml).toContain(p);
  }
});
```

LegalNav `<nav aria-label>` mətni lüğətdə: `legalNav: "Hüquqi səhifələr" / "Legal pages" / "Правовые страницы"`.

Run: `npm run build && npm run test:e2e -- static-pages` → FAIL.

- [ ] **Addım 2: `staticPageMetadata`** — `src/lib/seo.ts`-ə:

```ts
import { getPage } from "@/features/pages/queries";
import type { PageKey } from "@/features/pages/types";
import { pick } from "@/i18n/config";

export async function staticPageMetadata(key: PageKey, lang: Locale): Promise<Metadata> {
  const p = await getPage(key);
  const title = pick(p.seo.title, lang) || `${pick(p.title, lang)} | ${siteName}`;
  const description = pick(p.seo.description, lang) || undefined;
  return pageMetadata({ route: key, lang, title, description });
}
```

(`RouteKey`-də `terms`, `privacy`, `help`, `tariffs`, `contact` artıq var.)

- [ ] **Addım 3: Səhifələr**

`src/app/[lang]/terms/page.tsx` (privacy eyni, `key`/`active`/`figma` fərqli):

```tsx
import type { Metadata } from "next";
import { pick, type Locale } from "@/i18n/config";
import { href } from "@/i18n/routes";
import { getPage } from "@/features/pages/queries";
import { staticPageMetadata } from "@/lib/seo";
import { RichText } from "@/lib/rich-text";
import { PageShell } from "@/components/page/page-shell";
import { LegalNav } from "@/components/page/legal-nav";

export async function generateMetadata({ params }: PageProps<"/[lang]/terms">): Promise<Metadata> {
  return staticPageMetadata("terms", (await params).lang as Locale);
}

export default async function TermsPage({ params }: PageProps<"/[lang]/terms">) {
  const lang = (await params).lang as Locale;
  const page = await getPage("terms");
  const body = page.body[lang]?.content?.length ? page.body[lang] : page.body.az;
  return (
    <PageShell lang={lang} title={pick(page.title, lang)} currentPath={href("terms", lang)} figma="terms">
      <div className="flex flex-col gap-[60px] lg:flex-row">
        <RichText doc={body} className="text-body-md text-gray-700 lg:w-[880px]" />
        <LegalNav lang={lang} active="terms" gap={16} />
      </div>
    </PageShell>
  );
}
```

`src/components/faq/faq-list.tsx` (server, JS-siz — native `<details>`):

```tsx
import { Icon } from "@/components/ui/icon";

export function FaqList({ items }: { items: { id: string; question: string; answer: string }[] }) {
  return (
    <div className="flex flex-col gap-4 lg:w-[880px]">
      {items.map((q, i) => (
        <details key={q.id} open={i === 0} className="group flex flex-col gap-1.5">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-[6px] bg-gray-50 px-4 py-3 text-body-md-flat text-brand-950 [&::-webkit-details-marker]:hidden">
            <span>{q.question}</span>
            <Icon name="caret-down-brand" size={20} className="group-open:hidden" />
            <Icon name="caret-up" size={20} className="hidden group-open:block" />
          </summary>
          <p className="rounded-[6px] bg-gray-50 px-4 py-3 text-body-md-flat text-gray-700">{q.answer}</p>
        </details>
      ))}
    </div>
  );
}
```

`src/app/[lang]/help/page.tsx`: `PageShell` + `FaqList` (`pick` ilə) + `LegalNav active="help" gap={20}` + `<JsonLd data={faqJsonLd(...)} />`.

- [ ] **Addım 4: Sitemap** — `src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";
import { defaultLocale, locales } from "@/i18n/config";
import { alternates, type RouteKey } from "@/i18n/routes";
import { siteUrl } from "@/lib/seo";

const PUBLIC_STATIC: RouteKey[] = ["home", "terms", "privacy", "help", "tariffs", "contact"];

/** Static pages for now; factory/product/vacancy/news sitemaps are split files added in later steps. */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_STATIC.flatMap((route) => {
    const urls = alternates(route);
    return locales.map((l) => ({
      url: siteUrl + urls[l],
      alternates: { languages: { ...Object.fromEntries(locales.map((x) => [x, siteUrl + urls[x]])), "x-default": siteUrl + urls[defaultLocale] } },
    }));
  });
}
```

`robots.ts`-in istehsal şaxəsinə `sitemap: `${siteUrl}/sitemap.xml`` əlavə et.

- [ ] **Addım 5: E2E keçir** — `npm run build && npm run test:e2e -- static-pages` → PASS; sonra tam `npm run test:e2e`.

- [ ] **Addım 6: Commit**

```bash
git add src/app src/components/faq src/lib/seo.ts src/i18n tests/e2e/static-pages.spec.ts
git commit -m "feat: İstifadəçi qaydaları, Məxfilik siyasəti, Yardım (FAQ) səhifələri və sitemap

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 6: Tariflər səhifəsi və "İndi qoşul" yönləndirməsi

**Fayllar:**
- Yarat: `src/features/tariffs/join.ts`, `src/app/api/join/route.ts`, `src/components/ui/button.tsx`, `src/components/tariffs/tariff-card.tsx`, `src/app/[lang]/tariffs/page.tsx`, `tests/unit/join.test.ts`, `tests/e2e/tariffs.spec.ts`
- Dəyiş: `src/i18n/routes.ts` (kabinet alt seqmenti), lüğətlər

**İnterfeyslər:**
- İstifadə edir: `getTariffs`, `formatPrice`, `getPage("tariffs")`, `getSessionUser`, `PageShell`, `Icon`
- Verir:
  - `cabinetPath(section: "tariffs", lang: Locale): string` → `/kabinet/tarifler`, `/en/cabinet/pricing`, `/ru/lichnyj-kabinet/tarify`
  - `joinTarget(o: { lang: Locale; plan: string; role: "factory" | "admin" | null; knownDevice: boolean }): string`
  - `KNOWN_DEVICE_COOKIE = "zv_known"`
  - `<Button variant? …buttonProps>` və `<ButtonLink variant? href …linkProps>` — Figma "Button / Primary / Medium 40" (`157:2344`: h40, pad 8/10, r4, `brand-950`, `body-md white`)
  - `<TariffCard plan lang joinHref />`

- [ ] **Addım 1: Uğursuz test** — `tests/unit/join.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { joinTarget } from "../../src/features/tariffs/join.ts";

test("signed-in factory goes to cabinet tariffs with the plan", () => {
  assert.equal(joinTarget({ lang: "az", plan: "premium", role: "factory", knownDevice: true }), "/kabinet/tarifler?plan=premium");
  assert.equal(joinTarget({ lang: "en", plan: "vip", role: "factory", knownDevice: false }), "/en/cabinet/pricing?plan=vip");
});

test("known device without session goes to login, then back to cabinet tariffs", () => {
  assert.equal(
    joinTarget({ lang: "az", plan: "premium", role: null, knownDevice: true }),
    "/daxil-ol?next=" + encodeURIComponent("/kabinet/tarifler?plan=premium"),
  );
});

test("new visitor goes to registration with the plan", () => {
  assert.equal(joinTarget({ lang: "ru", plan: "vip", role: null, knownDevice: false }), "/ru/registraciya?plan=vip");
});

test("admins are treated as visitors; unknown plans are dropped", () => {
  assert.equal(joinTarget({ lang: "az", plan: "x", role: "admin", knownDevice: false }), "/qeydiyyat");
});
```

Run → FAIL.

- [ ] **Addım 2: `routes.ts` + `join.ts`**

`src/i18n/routes.ts`-ə:

```ts
const CABINET_SECTIONS = { tariffs: { az: "tarifler", en: "pricing", ru: "tarify" } } as const satisfies Record<string, Localized>;

/** Cabinet sub-page URL (pages themselves arrive in step 7). */
export function cabinetPath(section: keyof typeof CABINET_SECTIONS, lang: Locale): string {
  return href("cabinet", lang, CABINET_SECTIONS[section][lang]);
}
```

`src/features/tariffs/join.ts`:

```ts
import type { Locale } from "@/i18n/config";
import { cabinetPath, href } from "@/i18n/routes";

export const KNOWN_DEVICE_COOKIE = "zv_known";
const PLANS = new Set(["standart", "premium", "vip"]);

/** Where "İndi qoşul" leads (user decision 2026-11-12). Pure, so it is unit-tested. */
export function joinTarget(o: { lang: Locale; plan: string; role: "factory" | "admin" | null; knownDevice: boolean }): string {
  const plan = PLANS.has(o.plan) ? o.plan : null;
  const q = plan ? `?plan=${plan}` : "";
  const cabinet = cabinetPath("tariffs", o.lang) + q;
  if (o.role === "factory") return cabinet;
  if (o.knownDevice) return `${href("login", o.lang)}?next=${encodeURIComponent(cabinet)}`;
  return href("register", o.lang) + q;
}
```

- [ ] **Addım 3: `src/app/api/join/route.ts`**

```ts
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "@/i18n/config";
import { getSessionUser } from "@/lib/auth";
import { joinTarget, KNOWN_DEVICE_COOKIE } from "@/features/tariffs/join";

/** /api/join?plan=premium&lang=az → 303 to cabinet / login / registration (no indexing: /api is disallowed). */
export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang") ?? "az";
  const plan = request.nextUrl.searchParams.get("plan") ?? "";
  const user = await getSessionUser();
  const knownDevice = (await cookies()).get(KNOWN_DEVICE_COOKIE)?.value === "1";
  const to = joinTarget({ lang: hasLocale(lang) ? lang : "az", plan, role: user?.role ?? null, knownDevice });
  return NextResponse.redirect(new URL(to, request.url), 303);
}
```

- [ ] **Addım 4: `Button` və `TariffCard`**

`src/components/ui/button.tsx` (server-safe, JS-siz):

```tsx
import Link from "next/link";
import type { ComponentProps } from "react";

const base = "inline-flex h-10 items-center justify-center gap-1.5 rounded-[4px] px-2.5 text-body-md";
const variants = {
  primary: "bg-brand-950 text-white hover:bg-brand-900 disabled:opacity-60",
} as const;
type Variant = keyof typeof variants;

const cls = (variant: Variant, className = "") => `${base} ${variants[variant]} ${className}`;

/** Figma "Button / Primary / Medium 40" (157:2344) as a <button>. */
export function Button({ variant = "primary", className, ...rest }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button {...rest} className={cls(variant, className)} />;
}

/** Same look as a link (no prefetch: targets are redirects or dynamic). */
export function ButtonLink({ variant = "primary", className, ...rest }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link prefetch={false} {...rest} className={cls(variant, className)} />;
}
```

Hover rəngi Figma-da (`Buttons` frame `52:1727`, State=Hover) inspect edilib təyin olunur; yuxarıdakı `hover:bg-brand-900` yalnız Figma ilə eynidirsə qalır.

`src/components/tariffs/tariff-card.tsx` (server): Figma `157:2313` (Standart), `157:2335` (Premium), `157:2370` (VİP):
- Xarici: `427` en (desktop; mobil inspect), `rounded-[16px] bg-gray-50 p-2.5`, `gap-6`.
- Daxili ağ kart: `rounded-[13px] bg-white p-4`, kölgə `shadow-[0_16px_40px_0_rgba(119,127,168,0.15)]`, `gap-6`: başlıq sırası (ikon 28 + `text-h5` ad, gap 8) → 48px → qiymət sırası (`text-h2` qiymət + `text-subtitle-1 text-gray-500` "/Ay", gap 10, `items-end`; `priceMonthQ === 0` → yalnız "Pulsuz", "/Ay" yox) → düymə (yalnız ödənişli planlarda; `ButtonLink href={joinHref}` `w-full`, mətn "İndi qoşul", `rel="nofollow"`).
- Xüsusiyyətlər: `px-4`, `gap-4`, hər sətir `CheckCircle 20` + `text-body-sm text-gray-700` (gap 6).
- Kartlar arası `gap-5`, desktop sıra, mobil sütun.

Lüğətə: `tariffs: { perMonth: "/Ay" | "/Month" | "/Мес", free: "Pulsuz" | "Free" | "Бесплатно", join: "İndi qoşul" | "Join now" | "Подключить" }`.

- [ ] **Addım 5: Səhifə** — `src/app/[lang]/tariffs/page.tsx`: `staticPageMetadata("tariffs", lang)`; `PageShell` (başlıq `page.title`), altında `intro` (`text-body-lg`? → **inspect** `157:2116`-nın ikinci TEXT-inin stili ilə), sonra kartlar. `joinHref` = `` `/api/join?plan=${code}&lang=${lang}` ``. Figma-da başlıq + intro bloku 617 en, blok → kartlar 48px.

- [ ] **Addım 6: E2E** — `tests/e2e/tariffs.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test("tariffs page shows 3 plans from the database", async ({ page }) => {
  await page.goto("/tarifler");
  await expect(page.getByRole("heading", { level: 1, name: "Tariflər" })).toBeVisible();
  for (const name of ["Standart", "Premium", "VİP"]) await expect(page.getByText(name, { exact: true })).toBeVisible();
  await expect(page.getByText("Pulsuz", { exact: true })).toBeVisible();
  await expect(page.getByText("7.99₼")).toBeVisible();
  await expect(page.getByText("9.99₼")).toBeVisible();
  await expect(page.getByRole("link", { name: "İndi qoşul" })).toHaveCount(2);
});

test("join as a new visitor leads to registration with the plan", async ({ page }) => {
  await page.goto("/tarifler");
  const res = await page.request.get("/api/join?plan=premium&lang=az", { maxRedirects: 0 });
  expect(res.status()).toBe(303);
  expect(res.headers()["location"]).toMatch(/\/qeydiyyat\?plan=premium$/);
});

test("join from a known device leads to login", async ({ context, page }) => {
  await context.addCookies([{ name: "zv_known", value: "1", url: "http://localhost:3100" }]);
  const res = await page.request.get("/api/join?plan=vip&lang=en", { maxRedirects: 0 });
  expect(res.headers()["location"]).toContain("/en/login?next=");
});
```

`npm run build && npm run test:e2e -- tariffs` → PASS; tam suite.

- [ ] **Addım 7: Commit**

```bash
git add src tests
git commit -m "feat: Tariflər səhifəsi və 'İndi qoşul' yönləndirməsi (kabinet / daxil ol / qeydiyyat)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 7: Əlaqə səhifəsi və forması

**Fayllar:**
- Yarat: `src/lib/mail.ts`, `src/features/contact/{schema.ts,actions.ts}`, `src/components/ui/{field.tsx,textarea-field.tsx,select-field.tsx,modal.tsx}`, `src/components/contact/{contact-info.tsx,contact-form.tsx}`, `src/app/[lang]/contact/page.tsx`, `tests/e2e/contact.spec.ts`
- Dəyiş: `tests/unit/contact.test.ts` (schema testləri), `src/lib/env.ts` (SMTP), `.env.example`, `deploy/cpanel/env.example`, `package.json` (`nodemailer`, `@types/nodemailer`), lüğətlər

**İnterfeyslər:**
- İstifadə edir: `getContactSettings`, `getSiteSettings`, `consumeAttempt`, `clientIpHash`, `contactMessages`, `pick`, `PageShell`, `WhatsAppLink` ideyası, `SocialIcon variant="light"`
- Verir:
  - `contactSchema(topicIds: string[])` → zod obyekti; `parseContactForm(form: FormData, topicIds: string[])` → `{ ok: true; data: ContactInput } | { ok: false; errors: Record<string, string> }` (xəta açarları sahə adları, dəyərlər **lüğət açarı**: `"required" | "email" | "phone" | "tooLong" | "topic"`)
  - `sendContact(prev: ContactState, form: FormData): Promise<ContactState>`; `ContactState = { ok?: boolean; errors?: Record<string, string>; values?: Record<string, string>; formError?: "rateLimited" | "server" } | undefined`
  - `sendMail(o: { to: string[]; subject: string; text: string; replyTo?: string }): Promise<boolean>`
  - UI: `<Field name label required? type? error? defaultValue? placeholder? help? />`, `<TextareaField … maxLength counter />`, `<SelectField name label options={{ value; label }[]} placeholder error? defaultValue? />` (client; listbox a11y), `<Modal open onClose title>`

Figma: məzmun `153:4374` (desktop) / `692:19212` (mobil). Sol sütun 617 (başlıq + intro, sonra əlaqə siyahısı: Telefon / E-mail / Social Media — ikon 24 + `text-subtitle-2-medium` başlıq, dəyər `text-body-md text-gray-700`, aralarda 1px `gray-200` xətt, bloklar `py-4` gap 10/16; sosial dairələr 44 gap 6), böyük WhatsApp düyməsi (302×62, `rounded-full`, `bg-whatsapp-bg`, **2px** `border-whatsapp-border`, ikon 30 + `text-subtitle-3-medium text-whatsapp-text`, pad 16/24). Sağ sütun 605: 2 sıra × 2 sahə (295 en, gap 16), Mövzu (605), Mesaj (605, 147 hündürlük, sayğac `0/200`), "Müraciət et" düyməsi. Sahə komponenti: `52:2198` (state-lər: Default, Hover, Typing, Filled, Error, Disabled), textarea `52:2343`, dropdown `52:2273` (Default, Filled, Hover, Open) + item `52:2327` (Default, Hover, Active). Uğur pəncərəsi: `244:9480` frame-indəki popup (inspect: ölçü, ikon, başlıq "Qəbul olundu!", mətn, "Ana səhifəyə" düyməsi). **Hər state-in dəyərlərini inspect et və CSS-də tətbiq et** (`hover:`, `focus:`, `aria-invalid:`).

- [ ] **Addım 1: Uğursuz testlər** — `tests/unit/contact.test.ts`-ə əlavə et:

```ts
import { parseContactForm } from "../../src/features/contact/schema.ts";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const valid = { firstName: "Aysel", lastName: "Məmmədova", email: "a@b.az", phone: "+994 50 123 45 67", topic: "advertising", message: "Salam" };

test("valid contact form parses and trims", () => {
  const r = parseContactForm(form({ ...valid, firstName: "  Aysel " }), ["advertising", "other"]);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.data.firstName, "Aysel");
});

test("errors are dictionary keys per field", () => {
  const r = parseContactForm(form({ ...valid, email: "x", phone: "12", topic: "nope", message: "a".repeat(201), firstName: "" }), ["advertising"]);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.errors.email, "email");
    assert.equal(r.errors.phone, "phone");
    assert.equal(r.errors.topic, "topic");
    assert.equal(r.errors.message, "tooLong");
    assert.equal(r.errors.firstName, "required");
  }
});
```

Run → FAIL.

- [ ] **Addım 2: `src/features/contact/schema.ts`**

```ts
import { z } from "zod";

export const MESSAGE_MAX = 200;
const text = (max: number) => z.string().trim().min(1, "required").max(max, "tooLong");

export const contactSchema = (topicIds: string[]) =>
  z.object({
    firstName: text(60),
    lastName: text(60),
    email: z.string().trim().min(1, "required").pipe(z.email("email")),
    phone: z.string().trim().min(1, "required").regex(/^\+?[\d\s()-]{9,20}$/, "phone"),
    topic: z.string().refine((v) => topicIds.includes(v), "topic"),
    message: text(MESSAGE_MAX),
  });

export type ContactInput = z.infer<ReturnType<typeof contactSchema>>;

export function parseContactForm(form: FormData, topicIds: string[]) {
  const raw = Object.fromEntries(["firstName", "lastName", "email", "phone", "topic", "message"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = contactSchema(topicIds).safeParse(raw);
  if (parsed.success) return { ok: true as const, data: parsed.data };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
  return { ok: false as const, errors, values: raw };
}
```

- [ ] **Addım 3: `src/lib/mail.ts` + env**

`npm install nodemailer && npm install -D @types/nodemailer`.

`src/lib/env.ts`-ə (həm prod, həm dev sxeminə) könüllü sahələr: `SMTP_HOST`, `SMTP_PORT` (default `465` prod / `1027` dev), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (default `"Zavod.az <noreply@zavod.az>"`); ixrac `smtp: { host?: string; port: number; user?: string; pass?: string; from: string }`. `.env.example`-ə `SMTP_HOST=localhost`, `SMTP_PORT=1027` (Mailpit), `deploy/cpanel/env.example`-ə SMTP bloku (`noreply@zavod.az` poçt qutusu, cPanel).

```ts
import "server-only";
import nodemailer from "nodemailer";
import { smtp } from "@/lib/env";

const transport = smtp.host
  ? nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    })
  : null;

/** Sends a plain-text email. Never throws: a mail failure must not lose the saved submission. */
export async function sendMail(o: { to: string[]; subject: string; text: string; replyTo?: string }): Promise<boolean> {
  if (!o.to.length) return false;
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
```

- [ ] **Addım 4: `src/features/contact/actions.ts`**

```ts
"use server";

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

export async function sendContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  // Spam traps: hidden field must stay empty; humans need more than 3 s to fill the form.
  const startedAt = Number(form.get("startedAt"));
  if (String(form.get("website") ?? "") !== "" || !startedAt || Date.now() - startedAt < MIN_FILL_MS) {
    return { ok: true }; // silent: do not tell bots they were caught
  }
  const ipHash = await clientIpHash();
  if (!(await consumeAttempt(`contact:${ipHash}`, 5, 60 * 60))) return { formError: "rateLimited" };

  const settings = await getContactSettings();
  const parsed = parseContactForm(form, settings.topics.map((t) => t.id));
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values };

  const langRaw = String(form.get("lang") ?? "az");
  const lang: Locale = hasLocale(langRaw) ? langRaw : "az";
  const topic = settings.topics.find((t) => t.id === parsed.data.topic)!;
  const { topic: _topicId, ...fields } = parsed.data;
  try {
    await db.insert(contactMessages).values({ ...fields, topicId: topic.id, topicLabel: topic.label.az, lang, ipHash });
  } catch (error) {
    console.error("contact: insert failed", error);
    // Give the typed values back so nothing the visitor wrote is lost.
    return { formError: "server", values: { ...parsed.data } };
  }
  await sendMail({
    to: settings.notifyEmails,
    subject: `Zavod.az — yeni müraciət: ${topic.label.az}`,
    replyTo: parsed.data.email,
    text: [
      `Ad: ${parsed.data.firstName} ${parsed.data.lastName}`,
      `E-mail: ${parsed.data.email}`,
      `Telefon: ${parsed.data.phone}`,
      `Mövzu: ${topic.label.az}`,
      `Dil: ${lang}`,
      "",
      parsed.data.message,
    ].join("\n"),
  });
  return { ok: true };
}
```

`_topicId` lint-də "unused" xəbərdarlığı verərsə, `contactMessages` insert-ini açıq sahələrlə yaz (`firstName: parsed.data.firstName, …`) — `topic` sütunu yoxdur, ona görə `parsed.data` birbaşa yayıla bilməz.

- [ ] **Addım 5: UI komponentləri**

`Field`, `TextareaField` — server-safe (JS-siz; xəta mətni prop-dan). Struktur (Figma `52:2199`):

```tsx
type FieldProps = {
  name: string;
  label: string;
  required?: boolean;
  type?: "text" | "email" | "tel";
  placeholder?: string;
  defaultValue?: string;
  error?: string; // already translated text
  autoComplete?: string;
};

export function Field({ name, label, required, type = "text", placeholder, defaultValue, error, autoComplete }: FieldProps) {
  const id = `f-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex gap-1 text-subtitle-2s text-brand-950">
        {label}
        {required && <span aria-hidden className="text-red-700">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className="h-10 rounded-[4px] border border-gray-200 bg-white px-3 text-body-md text-brand-950 placeholder:text-gray-400 hover:border-gray-300 focus:border-brand-500 focus:outline-none aria-invalid:border-red-700"
      />
      {error && (
        <p id={`${id}-err`} className="text-caption text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
```

Figma-dakı "Caption text here" sətri **yalnız xəta/izahat olanda** göstərilir (default halda yer tutmur) — `figma:inspect 52:2199` və `52:2223` ilə müqayisə et: Default state-də caption görünürsə (hündürlük 71), sahə hündürlüyü həndəsə yoxlamasında Figma ilə eyni olmalıdır → o halda boş caption yerini `min-h-[16px]` ilə saxla. Bütün rəng/ölçülər state-lərin inspect nəticəsinə uyğunlaşdırılır.

`SelectField` (client, `"use client"`): gizli `<input type="hidden" name>` + `<button aria-haspopup="listbox" aria-expanded>` + `<ul role="listbox">` (Figma `52:2310` Open state, item `52:2328`/`52:2333`/`52:2338`); klaviatura: ↑/↓/Enter/Escape/Home/End; kənara klikdə bağlanır. Zod import etmir.

`TextareaField` (client — sayğac üçün): `<textarea maxLength={200}>` + sağ altda `{n}/200` (`text-caption text-gray-500`), Figma `52:2344`.

`Modal` (client): native `<dialog>` (`showModal`), Figma popup ölçü/radius/kölgəsi; `onClose`; fokus bağlanma düyməsinə.

- [ ] **Addım 6: `ContactForm` (client) və səhifə**

`ContactForm` — `useActionState(sendContact, undefined)`; gizli sahələr: `lang`, `startedAt` (`useEffect`-də `Date.now()`), honeypot `website` (`className="hidden"`, `tabIndex={-1}`, `autoComplete="off"`, `aria-hidden`). Xəta açarlarını lüğətlə tərcümə edir (`t.contact.errors[key]`). `state.values` ilə `defaultValue` (addım 0-dakı R19 nümunəsi — səhv zamanı yazılanlar itmir). `state.ok` → `Modal` ("Qəbul olundu!", mətn: lüğətdən — "Müraciətiniz qəbul olundu. Tezliklə sizinlə əlaqə saxlanılacaq.", düymə "Ana səhifəyə" → `href("home", lang)`), form sıfırlanır. `formError` → formun altında `role="alert"` mətni.

`ContactInfo` (server): sayt ayarlarından telefon, e-mail, sosial (yalnız dolu olanlar, `SocialIcon variant="light"`), böyük WhatsApp linki.

`src/app/[lang]/contact/page.tsx`: `staticPageMetadata("contact", lang)`; `PageShell` + intro (`pick(page.intro)`) + iki sütun (`ContactInfo` | `ContactForm topics={…labels} lang`); topic etiketləri server-də `pick` ilə hazırlanır və client-ə sadə `{value,label}[]` kimi ötürülür.

Lüğət (`contact`): sahə etiketləri (Adınız, Soyadınız, E-mail, Nömrə, Mövzu, Mesajınız; placeholder-lər Figma-dan: "Type here..." əvəzinə Azərbaycanca uyğun mətn — Figma-dakı placeholder-ləri inspect et; "Mövzunu seçin", "Mesajınızı daxil edin"), düymə "Müraciət et", xətalar (`required`: "Bu sahə mütləqdir", `email`: "E-mail düzgün deyil", `phone`: "Nömrə düzgün deyil", `tooLong`: "Mətn çox uzundur", `topic`: "Mövzunu seçin", `rateLimited`: "Çox müraciət göndərildi. Bir az sonra yenidən yoxlayın.", `server`: "Xəta baş verdi, yenidən cəhd edin."), uğur mətnləri, "Telefon", "E-mail", "Social Media" → AZ: "Sosial şəbəkələr"? — **Figma "Social Media" yazır; AZ-da Figma mətni saxlanılır** (həndəsə üçün), EN "Social media", RU "Соцсети". Hamısı 3 dildə.

- [ ] **Addım 7: E2E** — `tests/e2e/contact.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
test.afterAll(() => sql.end());
test.afterEach(async () => {
  await sql`delete from rate_limits`;
});
test.use({ viewport: { width: 1440, height: 900 } });

async function fill(page: import("@playwright/test").Page, email = "aysel@test.az") {
  await page.getByLabel("Adınız").fill("Aysel");
  await page.getByLabel("Soyadınız").fill("Məmmədova");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Nömrə").fill("+994 50 123 45 67");
  await page.getByRole("button", { name: /Mövzu/ }).click();
  await page.getByRole("option", { name: "Reklam" }).click();
  await page.getByLabel("Mesajınız").fill("Salam, reklam barədə məlumat istəyirəm.");
  await page.waitForTimeout(3100); // anti-bot timer
}

test("valid message is saved and the success dialog shows", async ({ page }) => {
  const email = `e2e-${Date.now()}@test.az`;
  await page.goto("/elaqe");
  await fill(page, email);
  await page.getByRole("button", { name: "Müraciət et" }).click();
  await expect(page.getByRole("dialog")).toContainText("Qəbul olundu!");
  const rows = await sql`select topic_id, lang from contact_messages where email = ${email}`;
  expect(rows).toEqual([{ topic_id: "advertising", lang: "az" }]);
});

test("invalid email keeps typed values and shows the field error", async ({ page }) => {
  await page.goto("/elaqe");
  await fill(page, "yanlis");
  await page.getByRole("button", { name: "Müraciət et" }).click();
  await expect(page.getByText("E-mail düzgün deyil")).toBeVisible();
  await expect(page.getByLabel("Adınız")).toHaveValue("Aysel");
});

test("character counter follows the message", async ({ page }) => {
  await page.goto("/elaqe");
  await page.getByLabel("Mesajınız").fill("Salam");
  await expect(page.getByText("5/200")).toBeVisible();
});

test("a bot that submits instantly is silently ignored", async ({ page }) => {
  const email = `bot-${Date.now()}@test.az`;
  await page.goto("/elaqe");
  await page.getByLabel("Adınız").fill("Bot");
  await page.getByLabel("Soyadınız").fill("Bot");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Nömrə").fill("+994 50 000 00 00");
  await page.getByRole("button", { name: /Mövzu/ }).click();
  await page.getByRole("option", { name: "Digər" }).click();
  await page.getByLabel("Mesajınız").fill("spam");
  await page.getByRole("button", { name: "Müraciət et" }).click(); // < 3 s after load
  await expect(page.getByRole("dialog")).toContainText("Qəbul olundu!");
  expect(await sql`select 1 from contact_messages where email = ${email}`).toHaveLength(0);
});
```

(Bildiriş email-inin Mailpit-ə çatması Tapşırıq 9-da, admin formasından ünvan təyin edildikdən sonra yoxlanılır — ayarlar cache-ləndiyi üçün bazaya birbaşa yazmaq kifayət etmir.)

`npm run build && npm run test:e2e -- contact` → PASS; tam suite.

- [ ] **Addım 8: Commit**

```bash
git add src tests package.json package-lock.json .env.example deploy/cpanel/env.example
git commit -m "feat: Əlaqə səhifəsi — form (spam qoruması, cəhd limiti), bazaya yazma, email bildiriş

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 8: Admin — səhifələr (vizual redaktor) və FAQ

**Fayllar:**
- Yarat: `src/app/admin/_components/rich-text-editor.tsx` (client), `src/app/admin/_components/lang-tabs.tsx` (client), `src/app/admin/(panel)/pages/{page.tsx,[key]/page.tsx,[key]/page-form.tsx,actions.ts}`, `src/app/admin/(panel)/faq/{page.tsx,faq-form.tsx,actions.ts}`, `tests/e2e/admin-content.spec.ts`
- Dəyiş: `src/app/admin/(panel)/layout.tsx` (menyu), `package.json` (Tiptap)

**İnterfeyslər:**
- İstifadə edir: `requireAdmin`, `invalidateTags`, `pageTag`, `FAQ_TAG`, `pages`, `faqItems`, `PAGE_KEYS`, `RichDoc`, `defaultPages`
- Verir: `savePage(prev, form)`, `saveFaqItem(prev, form)`, `deleteFaqItem(id)`, `moveFaqItem(id, dir: "up" | "down")`, `toggleFaqItem(id)`

- [ ] **Addım 1: Uğursuz E2E** — `tests/e2e/admin-content.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./db";

test.use({ viewport: { width: 1440, height: 900 } });

test("admin edits the terms title and body; the site shows it at once", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/pages/terms");
  const title = page.getByLabel("Başlıq (AZ)");
  const original = await title.inputValue();
  try {
    await title.fill("Qaydalar (test)");
    const editor = page.locator('[data-editor="body-az"] [contenteditable="true"]');
    await editor.click();
    await page.keyboard.press("Control+End");
    await page.keyboard.type(" Yeni cümlə.");
    await page.getByRole("button", { name: "Yadda saxla" }).click();
    await expect(page.getByText("Yadda saxlanıldı")).toBeVisible();
    await page.goto("/istifadeci-qaydalari");
    await expect(page.getByRole("heading", { level: 1, name: "Qaydalar (test)" })).toBeVisible();
    await expect(page.locator("main")).toContainText("Yeni cümlə.");
  } finally {
    await page.goto("/admin/pages/terms");
    await page.getByLabel("Başlıq (AZ)").fill(original);
    await page.getByRole("button", { name: "Bərpa et (Figma mətni)" }).click(); // resets body to the seeded text
    await page.getByRole("button", { name: "Yadda saxla" }).click();
    await expect(page.getByText("Yadda saxlanıldı")).toBeVisible();
  }
});

test("admin adds, hides and deletes a FAQ item", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/faq");
  await page.getByRole("button", { name: "Yeni sual" }).click();
  await page.getByLabel("Sual (AZ)").fill("Test sualı?");
  await page.getByLabel("Cavab (AZ)").fill("Test cavabı.");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await page.goto("/yardim");
  await expect(page.getByText("Test sualı?")).toBeVisible();
  await page.goto("/admin/faq");
  const row = page.getByRole("row", { name: /Test sualı\?/ });
  await row.getByRole("button", { name: "Sil" }).click();
  await page.getByRole("button", { name: "Bəli, sil" }).click();
  await page.goto("/yardim");
  await expect(page.getByText("Test sualı?")).toHaveCount(0);
});
```

- [ ] **Addım 2: Tiptap redaktoru**

`npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link`.

`rich-text-editor.tsx` (`"use client"`): `useEditor({ extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, code: false, codeBlock: false, blockquote: false, horizontalRule: false, strike: false }), Link.configure({ openOnClick: false, protocols: ["http", "https", "mailto"], autolink: true })], content: initial, immediatelyRender: false })`; alətlər paneli: H2, H3, Qalın, Kursiv, Siyahı, Nömrəli siyahı, Link (prompt URL; `https?:|mailto:` yoxlanılır), Geri al/İrəli. Dəyər gizli `<input name={name} value={JSON.stringify(editor.getJSON())}>`. Konteyner `data-editor={name}`.

`lang-tabs.tsx`: AZ | EN | RU tabları; boş EN/RU sahəsi qırmızı nöqtə ilə (spec 8).

- [ ] **Addım 3: Səhifələr admin-i**

`/admin/pages` — 5 səhifənin siyahısı (ad, son yenilənmə). `/admin/pages/[key]` — `requireAdmin()`, `getPage`-dən (cache-siz birbaşa DB oxuması: admin üçün `db.select()…` + `defaultPages` fallback) forma: hər dil üçün Başlıq, Giriş mətni (yalnız `tariffs`, `contact`), Məzmun redaktoru (yalnız `terms`, `privacy`), SEO başlıq və təsvir (155 simvol sayğacı). "Bərpa et (Figma mətni)" düyməsi — cari dilin body-sini `defaultPages[key].body.az` ilə əvəz edir (yalnız formda; saxlamaq üçün "Yadda saxla").

`actions.ts`:

```ts
"use server";

import { z } from "zod";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { locales } from "@/i18n/config";
import { requireAdmin } from "@/lib/auth";
import { invalidateTags, pageTag } from "@/lib/cache/tags";
import { PAGE_KEYS, type PageKey, type RichDoc } from "@/features/pages/types";

export type PageSaveState = { ok?: boolean; error?: string } | undefined;

const loc = (max: number) => z.object(Object.fromEntries(locales.map((l) => [l, z.string().trim().max(max)])) as Record<"az" | "en" | "ru", z.ZodString>);
const docSchema = z.object({ type: z.literal("doc"), content: z.array(z.any()).optional() }).nullable();

export async function savePage(_prev: PageSaveState, form: FormData): Promise<PageSaveState> {
  await requireAdmin();
  const key = String(form.get("key")) as PageKey;
  if (!PAGE_KEYS.includes(key)) return { error: "Naməlum səhifə" };
  const get = (k: string) => String(form.get(k) ?? "");
  const group = (prefix: string) => Object.fromEntries(locales.map((l) => [l, get(`${prefix}.${l}`)]));
  const body = Object.fromEntries(
    locales.map((l) => {
      const raw = get(`body.${l}`);
      if (!raw) return [l, null];
      const parsed = docSchema.safeParse(JSON.parse(raw));
      return [l, parsed.success ? (parsed.data as RichDoc | null) : null];
    }),
  );
  const parsed = z
    .object({ title: loc(120), intro: loc(600), seo: z.object({ title: loc(70), description: loc(160) }) })
    .safeParse({ title: group("title"), intro: group("intro"), seo: { title: group("seoTitle"), description: group("seoDescription") } });
  if (!parsed.success || !parsed.data.title.az) return { error: "Başlıq (AZ) mütləqdir, uzunluq limitlərini yoxlayın" };
  const value = { key, ...parsed.data, body: body as Record<"az" | "en" | "ru", RichDoc | null> };
  await db.insert(pages).values(value).onConflictDoUpdate({ target: pages.key, set: value });
  await invalidateTags([pageTag(key)]);
  return { ok: true };
}
```

(`JSON.parse` xətasını `try/catch` ilə tut → həmin dil `null` deyil, xəta qaytar: "Məzmun oxunmadı".)

- [ ] **Addım 4: FAQ admin-i** — `/admin/faq`: cədvəl (Sual AZ, Status toggle, ↑/↓, Redaktə, Sil — silmədə təsdiq dialoqu), "Yeni sual" formu (3 dildə sual və cavab, `published`). Action-lar `requireAdmin()` + zod + `invalidateTags([FAQ_TAG])`. Sıralama: `moveFaqItem` qonşu ilə `sort` dəyişir (tranzaksiya).

- [ ] **Addım 5: Menyu** — admin sol menyusuna: Səhifələr, FAQ (Yardım). (Tariflər, Əlaqə ayarları, Müraciətlər Tapşırıq 9-da.)

- [ ] **Addım 6: Yoxla və commit**

```bash
npm run typecheck && npm run lint && npm run test:unit
npm run build && npm run test:e2e
git add src package.json package-lock.json tests/e2e/admin-content.spec.ts
git commit -m "feat: admin — səhifə məzmunu (vizual redaktor, 3 dil, SEO) və FAQ idarəsi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Tiptap paketlərinin public səhifələrə düşmədiyini yoxla: `npm run build` çıxışında `/[lang]/terms` və s. üçün "First Load JS" əvvəlki dəyərə yaxın olmalıdır (report-a yaz).

---

### Tapşırıq 9: Admin — tariflər, əlaqə ayarları, müraciətlər

**Fayllar:**
- Yarat: `src/app/admin/(panel)/tariffs/{page.tsx,tariff-form.tsx,actions.ts}`, `src/app/admin/(panel)/contact/{page.tsx,contact-settings-form.tsx,actions.ts}`, `src/app/admin/(panel)/submissions/{page.tsx,actions.ts}`, `tests/e2e/admin-contact.spec.ts`
- Dəyiş: `src/app/admin/(panel)/layout.tsx` (menyu + oxunmamış sayğac), `src/app/admin/(panel)/page.tsx` (dashboard: son müraciətlər), `tests/e2e/contact.spec.ts` (skip testini sil, bura köçür)

**İnterfeyslər:**
- İstifadə edir: `requireAdmin`, `invalidateTags`, `TARIFFS_TAG`, `CONTACT_TAG`, `tariffPlans`, `contactMessages`, `siteSettings`, `CONTACT_SETTINGS_KEY`, `mergeContactSettings`, `formatPrice`
- Verir: `saveTariff(prev, form)`, `saveContactSettings(prev, form)`, `markRead(id)`, `deleteSubmission(id)`

- [ ] **Addım 1: Uğursuz E2E** — `tests/e2e/admin-contact.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./db";

test.use({ viewport: { width: 1440, height: 900 } });

test("admin changes the Premium price; the tariffs page shows it", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/tariffs");
  const price = page.getByLabel("Premium — aylıq qiymət (₼)");
  const original = await price.inputValue();
  try {
    await price.fill("8.49");
    await page.getByRole("button", { name: "Premium — yadda saxla" }).click();
    await expect(page.getByText("Yadda saxlanıldı")).toBeVisible();
    await page.goto("/tarifler");
    await expect(page.getByText("8.49₼")).toBeVisible();
  } finally {
    await page.goto("/admin/tariffs");
    await page.getByLabel("Premium — aylıq qiymət (₼)").fill(original);
    await page.getByRole("button", { name: "Premium — yadda saxla" }).click();
  }
});

test("notify email gets the contact message (Mailpit) and admin sees it unread", async ({ page, request }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/contact");
  await page.getByLabel("Bildiriş e-mailləri").fill("admin@zavod.test");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByText("Yadda saxlanıldı")).toBeVisible();

  await request.delete("http://localhost:8027/api/v1/messages");
  const email = `mail-${Date.now()}@test.az`;
  await page.goto("/elaqe");
  await page.getByLabel("Adınız").fill("Rəşad");
  await page.getByLabel("Soyadınız").fill("Əliyev");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Nömrə").fill("+994 55 000 00 00");
  await page.getByRole("button", { name: /Mövzu/ }).click();
  await page.getByRole("option", { name: "Əməkdaşlıq" }).click();
  await page.getByLabel("Mesajınız").fill("Əməkdaşlıq təklifi");
  await page.waitForTimeout(3100);
  await page.getByRole("button", { name: "Müraciət et" }).click();
  await expect(page.getByRole("dialog")).toContainText("Qəbul olundu!");

  await expect
    .poll(async () => (await (await request.get("http://localhost:8027/api/v1/messages")).json()).total, { timeout: 10_000 })
    .toBeGreaterThan(0);

  await page.goto("/admin/submissions");
  const row = page.getByRole("row", { name: new RegExp(email) });
  await expect(row).toContainText("Əməkdaşlıq");
  await expect(row.getByText("Yeni")).toBeVisible();

  await page.goto("/admin/contact");
  await page.getByLabel("Bildiriş e-mailləri").fill("");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
});
```

- [ ] **Addım 2: Tariflər admin-i** — `/admin/tariffs`: 3 kart-forma (hər plan): ad (3 dil), aylıq qiymət ₼ (onluq, `0` = Pulsuz), illik qiymət ₼ (boş = yoxdur), xüsusiyyətlər (3 dil, hər sətir bir xüsusiyyət, textarea), limitlər (məhsul, vakansiya; boş = limitsiz). `saveTariff`: `requireAdmin()`, zod (qiymət `^\d{1,4}([.,]\d{1,2})?$` → qəpik, `Math.round(x*100)`), `update tariff_plans where code`, `invalidateTags([TARIFFS_TAG])`. Etiketlər test locator-larına uyğun: "<Ad> — aylıq qiymət (₼)", düymə "<Ad> — yadda saxla".

- [ ] **Addım 3: Əlaqə ayarları** — `/admin/contact`: Mövzular (3 dildə etiket, əlavə/sil/sırala; `id` yeni mövzuda adın AZ transliterasiyasından slug), Bildiriş e-mailləri (vergül və ya yeni sətirlə ayrılmış; hər biri `z.email()`). `saveContactSettings` → `site_settings` `contact` upsert + `invalidateTags([CONTACT_TAG])`. Ən azı 1 mövzu məcburidir.

- [ ] **Addım 4: Müraciətlər** — `/admin/submissions`: cədvəl (tarix, ad soyad, e-mail, telefon, mövzu, dil, status "Yeni"/"Oxunub"), sətrə klikdə mesaj açılır və `markRead`; "Sil" (təsdiqlə). Səhifələmə: 50-lik, `createdAt desc`, keyset (`createdAt < cursor`). Sol menyuda "Müraciətlər" yanında oxunmamışların sayı. Dashboard-da son 5 müraciət.

- [ ] **Addım 5: Yoxla və commit**

```bash
npm run typecheck && npm run lint && npm run test:unit
npm run build && npm run test:e2e
git add src tests
git commit -m "feat: admin — tariflər, əlaqə ayarları (mövzular, bildiriş e-mailləri), müraciətlər

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 10: Figma ilə yoxlama (həndəsə + vizual) — bütün 1-ci addım səhifələri

**Fayllar:**
- Dəyiş: `tests/visual/targets.json`, səhifə komponentlərinin CSS-i (lazım olduqca)
- Yarat: `design/reference/{desktop,mobile}/{terms,privacy,help,tariffs,contact}.png`

**Hədəflər** (hər biri desktop 1440 və mobil 320; `selector` = `[data-figma=<name>]` — `PageShell`-in `<main>`-i):

| name | desktop node | mobil node | path | aliases / qeyd |
|---|---|---|---|---|
| terms | `143:4005` | `685:20709` məzmun hissəsi (inspect: breadcrumb + başlıq + mətn + hüquqi kart) | `/istifadeci-qaydalari` | — |
| privacy | `153:4077` | `685:21556` məzmun hissəsi | `/mexfilik-siyaseti` | — |
| help | `153:4182` | `685:21648` məzmun hissəsi | `/yardim` | — |
| tariffs | `157:2109` | `696:19453` məzmun hissəsi | `/tarifler` | — |
| contact | `153:4374` | `692:19212` məzmun hissəsi | `/elaqe` | `"+994 00 000 00 00"` → sayt telefonu; intro-da "Fabrik.az" → "Zavod.az" |

Mobil Figma-da məzmun bir neçə qardaş frame-ə bölünübsə (məs. hüquqi kart ayrıca frame-dədir), hər biri ayrıca hədəf olur (`terms-nav` və s.), saytda uyğun elementə `data-figma` verilir.

- [ ] **Addım 1: Referanslar**

```bash
npm run figma:references
```

Figma şəkil API-si hələ limitdədirsə skript dərhal "rate limit … retry after ~N h" xətası verir. O halda **dayan və controller-ə bildir** (controller istifadəçidən 10 PNG-nin əl ilə export-unu istəyəcək — fayllar `design/manual-export/reference/`-ə qoyulacaq, sən onları `design/reference/<bp>/<name>.png`-ə köçürəcəksən, ölçüsünü dəyişmədən).

- [ ] **Addım 2: Yoxlama dövrü** — `npm run build`, `npx next start -p 3100 &`, `npm run visual:check`. Uğursuz hədəflərdə `figma:inspect` dəyərləri ilə CSS-i düzəlt (tolerans yox, CSS dəyişir), təkrar et. Bütün hədəflər: ölçü eyni, həndəsə ±1px, vizual ≤ 2.5%.

- [ ] **Addım 3: Tam testlər** — serveri dayandır; `npm run typecheck && npm run lint && npm run test:unit && npm run test:e2e`.

- [ ] **Addım 4: Commit**

```bash
git add tests/visual design/reference src
git commit -m "test: 1-ci addım səhifələri Figma ilə yoxlanılır (həndəsə ±1px, vizual ≤2.5%)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Addım 1 bitdi sayılır, əgər:

- [ ] 5 səhifə 3 dildə açılır; başlıq, breadcrumb, hüquqi naviqasiya, məzmun bazadan gəlir; boş EN/RU AZ-a düşür
- [ ] Hər səhifənin canonical/hreflang/OG + DB-dən SEO başlığı/təsviri var; BreadcrumbList (hamısı), FAQPage (Yardım) JSON-LD; `sitemap.xml` 6 səhifəni 3 dildə göstərir
- [ ] Əlaqə forması: xətalar sahə yanında, yazılanlar itmir, honeypot + 3 saniyə + 5/saat limit, bazaya yazılır, bildiriş email-i gedir (Mailpit), admin-də "Yeni" kimi görünür
- [ ] "İndi qoşul": yeni ziyarətçi → qeydiyyat, tanınan cihaz → daxil ol, daxil olmuş zavod → kabinet/Tariflər
- [ ] Admin: səhifə mətnləri (vizual redaktor, 3 dil, SEO), FAQ (əlavə/gizlət/sırala/sil), tariflər (qiymət, xüsusiyyət, limit), əlaqə ayarları (mövzular, e-maillər), müraciətlər — hər dəyişiklik saytda dərhal görünür
- [ ] `npm run visual:check` — 1-ci addımın bütün hədəfləri və addım 0-ın 5 hədəfi keçir
- [ ] typecheck, lint, unit, tam E2E — yaşıl; Tiptap public səhifələrin JS-inə düşmür
