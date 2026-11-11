# Addım 0 — Təməl: icra planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Məqsəd:** Boş, amma düzgün qurulmuş və test domendə işləyən Zavod.az. İçində: Figma token-ləri, Inter şrifti, 3 dilli routing, PostgreSQL + Drizzle, Figma ilə pikselə-piksel eyni Header / Footer / mobil menyu, admin girişi, admin-dən dəyişilən sayt ayarları (telefon, ünvan, sosial linklər), SEO əsasları və cPanel deploy.

**Arxitektura:** Tək Next.js 16 layihəsi (front + back). Açıq səhifələr `use cache` + `cacheTag` ilə cache-lənir, admin dəyişəndə teq yenilənir. Kod marketinq layihəsindəki sınanmış həllərə əsaslanır (`~/Desktop/marketing`): routing, sessiya, cache teq sinxronu, cPanel deploy skriptləri.

**Texnologiyalar:** Next.js 16.4.2, React 19.3.0, TypeScript, Tailwind CSS v4, PostgreSQL 13 (hostinqdəki versiya) + Drizzle ORM, zod 4, bcryptjs, Playwright, pixelmatch, node:test + tsx.

**Spec:** [02-spec.md](02-spec.md) · Figma inventarı: [01-figma-analiz.md](01-figma-analiz.md)

## Ümumi qaydalar (hər tapşırığa aiddir)

- UI Figma ilə **1:1, pikselə-piksel**. Ölçülər Figma API-dən götürülür, gözlə ölçülmür. 1440 və 320 enində avtomatik müqayisədə fərq **≤ 0.5%** olmalıdır (spec 1.1).
- Breakpoint: `< 1024px` mobil layout (Figma 320), `≥ 1024px` desktop layout (Figma 1440). 1440-dan geniş ekranda məzmun 1440 enində mərkəzdə qalır. Ölçülər `px` ilə yazılır, rem-scaling yoxdur.
- Rənglər və text style-lar yalnız token-lərdən gəlir (`src/styles/tokens.css`, Figma-dan generasiya). Kodda əl ilə hex yazılmır. İstisna: Figma-dakı düzbucaqlı radius `rounded-[4px]` kimi ölçülər.
- Dillər: AZ prefikssiz (`/`), EN `/en`, RU `/ru`.
- Hər istifadəçi mətni lüğətdən (`src/i18n/dictionaries`) və ya admin ayarlarından gəlir.
- Node 22 (hostinqdəki versiya). Yerli baza: Docker-də PostgreSQL **13**.
- Hər tapşırıq ayrıca commit. Commit mesajının sonu:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- Next.js 16-da API-lər dəyişib. Şübhə olanda əvvəlcə `node_modules/next/dist/docs/`-a bax (`AGENTS.md`).

## Başlamazdan əvvəl cavablanmalı suallar

| # | Sual | Hansı tapşırığa təsir edir | Cavab gələnə qədər |
|---|---|---|---|
| S1 | Footer-dəki **"Xidmətlər"** linki hara aparır? (Header-də "Tariflər" var, "Xidmətlər" səhifəsi yoxdur) | 10 | Tariflər səhifəsinə aparır |
| S2 | Loqonun **SVG** versiyası varmı? Figma-da loqo PNG şəkildir | 3 | Figma-dan 1x/2x/3x PNG → lossless WebP |
| S3 | Desktop dil seçicinin **açıq halı** Figma-da çəkilməyib | 10 | Eyni stildə sadə siyahı (Figma token-ləri ilə) |
| S4 | GitHub repo: kimin hesabında və hansı adla? (marketinq: `Quliyeva1o/marketingaz`) | 14 | — (deploy-dan əvvəl lazımdır) |
| S5 | **zavod.az** domeni harada qeydiyyatdadır, DNS kimdədir? Test ünvanı `new.zavod.az` olacaq | 14 | — (deploy-dan əvvəl lazımdır) |

---

## Fayl xəritəsi

```
zavod.az/
├─ package.json, tsconfig.json, next.config.ts, eslint.config.mjs, drizzle.config.ts, playwright.config.ts
├─ .env.example, docker-compose.dev.yml, AGENTS.md
├─ design/
│  ├─ reference/{desktop,mobile}/*.png     Figma export-ları (vizual test üçün)
│  └─ .cache/                              Figma faylının yerli nüsxəsi (gitignore)
├─ deploy/cpanel/                          app.js, deploy.sh, rollback.sh, backup.sh, check-server.sh,
│                                          htaccess.txt, media.htaccess, env.example, package.json, README.md
├─ drizzle/                                migration-lar (drizzle-kit generasiya edir)
├─ public/
│  ├─ icons/*.svg                          Figma-dan export olunan ikonlar
│  └─ brand/logo-*.webp                    Figma-dan export olunan loqo
├─ scripts/
│  ├─ figma/api.mts                        Figma REST API klienti
│  ├─ figma/tokens-lib.mts                 token çevirmə funksiyaları (test olunur)
│  ├─ figma/export-tokens.mts              → src/styles/tokens.css
│  ├─ figma/export-assets.mts              → public/icons, public/brand
│  ├─ figma/export-references.mts          → design/reference
│  ├─ figma/inspect.mts                    node ağacını dəqiq ölçülərlə çap edir
│  └─ seed/admin.mts                       admin yaradır / şifrəsini yeniləyir
├─ src/
│  ├─ app/
│  │  ├─ globals.css
│  │  ├─ robots.ts
│  │  ├─ [lang]/layout.tsx, page.tsx, not-found.tsx, [...rest]/page.tsx
│  │  ├─ admin/layout.tsx, actions.ts, login/{page,login-form}.tsx
│  │  ├─ admin/(panel)/layout.tsx, page.tsx, settings/{page,settings-form,actions}.tsx|ts
│  │  └─ api/dev/figma/[bp]/[name]/route.ts   (yalnız development)
│  ├─ components/
│  │  ├─ ui/icon.tsx, logo.tsx, whatsapp-link.tsx
│  │  ├─ layout/header.tsx, lang-switcher.tsx, mobile-menu.tsx, footer.tsx
│  │  └─ dev/figma-overlay.tsx
│  ├─ db/schema.ts, index.ts
│  ├─ features/settings/schema.ts, queries.ts
│  ├─ i18n/config.ts, routes.ts, dictionaries/{index,az,en,ru}.ts
│  ├─ lib/auth/{session,index}.ts, cache/{tags,tag-sync}.ts, rate-limit.ts, client-ip.ts, fonts.ts, seo.ts
│  ├─ styles/tokens.css                    (generasiya olunur — əl ilə dəyişmə)
│  ├─ instrumentation.ts
│  └─ proxy.ts
└─ tests/
   ├─ unit/routes.test.ts, figma-tokens.test.ts, settings.test.ts
   ├─ e2e/global-setup.ts, db.ts, routing.spec.ts, layout.spec.ts, admin-auth.spec.ts, settings.spec.ts
   └─ visual/targets.json, capture.mjs, compare.mjs
```

---

### Tapşırıq 1: Layihənin qurulması

**Fayllar:**
- Yarat: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.env.example`, `.env.local`, `docker-compose.dev.yml`, `AGENTS.md`, `src/app/[lang]/layout.tsx`, `src/app/[lang]/page.tsx`, `src/app/globals.css`
- Dəyiş: `.gitignore`
- Sil: `.env` (token `.env.local`-a köçürülür)

**İnterfeyslər:**
- Verir: `npm run dev | build | start | typecheck | lint | test:unit`, `@/*` → `src/*` alias.

- [ ] **Addım 1: `package.json` yaz**

```json
{
  "name": "zavod-web",
  "version": "0.1.0",
  "private": true,
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test:unit": "node --import tsx --test \"tests/unit/**/*.test.ts\"",
    "test:e2e": "playwright test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:seed-admin": "node --env-file-if-exists=.env.local --import tsx scripts/seed/admin.mts",
    "figma:inspect": "node --env-file-if-exists=.env.local --import tsx scripts/figma/inspect.mts",
    "figma:tokens": "node --env-file-if-exists=.env.local --import tsx scripts/figma/export-tokens.mts",
    "figma:assets": "node --env-file-if-exists=.env.local --import tsx scripts/figma/export-assets.mts",
    "figma:references": "node --env-file-if-exists=.env.local --import tsx scripts/figma/export-references.mts",
    "visual:capture": "node tests/visual/capture.mjs",
    "visual:compare": "node tests/visual/compare.mjs"
  },
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "drizzle-orm": "^0.45.4",
    "next": "16.4.2",
    "postgres": "^3.4.9",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "server-only": "^0.0.1",
    "zod": "^4.6.7"
  },
  "devDependencies": {
    "@playwright/test": "^1.64.1",
    "@tailwindcss/turbopack": "^4",
    "@types/node": "^22",
    "@types/pngjs": "^6.0.5",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "drizzle-kit": "^0.31.11",
    "eslint": "^9",
    "eslint-config-next": "16.4.2",
    "pixelmatch": "^7.1.0",
    "pngjs": "^7.0.0",
    "sharp": "^0.35.5",
    "tailwindcss": "^4",
    "tsx": "^4.23.15",
    "typescript": "^5"
  }
}
```

`sharp` hələlik yalnız skriptlərdə lazımdır. Media modulu gələndə (addım 2) `dependencies`-ə keçəcək.

- [ ] **Addım 2: Konfiqurasiya fayllarını marketinq-dən götür**

```bash
cp ../marketing/tsconfig.json ../marketing/eslint.config.mjs .
npm install
npx playwright install chromium
```

- [ ] **Addım 3: `next.config.ts` yaz**

```ts
import type { NextConfig } from "next";

// Shared hosting (cPanel / CloudLinux) shows the host's 32 CPUs but limits the account to
// one: `NEXT_BUILD_CPUS=1 npm run build` keeps the build's workers inside that limit.
const buildCpus = Number(process.env.NEXT_BUILD_CPUS) || undefined;

const nextConfig: NextConfig = {
  experimental: buildCpus ? { cpus: buildCpus, staticGenerationMaxConcurrency: 2 } : {},
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  cacheComponents: true,
  // Images are resized once at upload (sharp); the server never resizes per request (1 CPU).
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          ...(process.env.SITE_NOINDEX === "1" ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : []),
        ],
      },
    ];
  },
  turbopack: {
    root: process.cwd(),
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
};

export default nextConfig;
```

- [ ] **Addım 4: Mühit faylları**

`.env.example`:

```bash
# Copy to .env.local for development. Never commit real values.
SITE_URL=http://localhost:3000
# Test copies (new.zavod.az) must never be indexed
SITE_NOINDEX=
DATABASE_URL=postgres://zavod:zavod@localhost:5441/zavod
# First admin, created by `npm run db:seed-admin` (password ≥ 12 chars)
ADMIN_EMAIL=
ADMIN_PASSWORD=
# Salt for hashing visitor IPs (rate limits). `openssl rand -hex 32`
IP_HASH_SALT=
# cPanel / LiteSpeed: trust only the last X-Forwarded-For entry
CLIENT_IP_FROM=
# Figma REST API token (file_content:read) — design export scripts only
FIGMA_TOKEN=
FIGMA_FILE_KEY=iLz9wZPvZmcyxEWRKjMY4m
```

`.env.local` yarat: `.env.example`-in surəti. `FIGMA_TOKEN=` sətrinə köhnə `.env`-dəki `FİGMA_TOKEN` dəyərini yaz (açarı **I** hərfi ilə). `ADMIN_EMAIL`, `ADMIN_PASSWORD` və `IP_HASH_SALT`-ı doldur. Sonra:

```bash
rm .env
```

`.gitignore`-a əlavə et:

```
design/.cache/
.next/
next-env.d.ts
playwright-report/
```

- [ ] **Addım 5: `docker-compose.dev.yml`**

```yaml
# Local services: docker compose -f docker-compose.dev.yml up -d
#   Postgres 13 (same major version as the hosting) on localhost:5441
#   Mailpit SMTP localhost:1026, inbox http://localhost:8026
services:
  db:
    image: postgres:13-alpine
    environment:
      POSTGRES_USER: zavod
      POSTGRES_PASSWORD: zavod
      POSTGRES_DB: zavod
    ports:
      - "5441:5432"
    volumes:
      - pgdata-dev:/var/lib/postgresql/data
  mailpit:
    image: axllent/mailpit:v1.27
    ports:
      - "1026:1025"
      - "8026:8025"
volumes:
  pgdata-dev:
```

Portlar marketinq-dəkindən (5440, 1025) fərqlidir ki, iki layihə eyni vaxtda işləyə bilsin.

- [ ] **Addım 6: `AGENTS.md`**

```markdown
# Zavod.az — agent qaydaları

- Bütün istifadəçi mətnləri, sənədlər, commit təsvirləri Azərbaycan dilində.
- UI Figma ilə 1:1 pikselə-piksel (docs/02-spec.md, bölmə 1.1). Ölçüləri `npm run figma:inspect -- <node-id>` ilə götür, gözlə ölçmə.
- Rəng və text style yalnız `src/styles/tokens.css`-dən (generasiya: `npm run figma:tokens`).
- Next.js 16: API-lər dəyişib, şübhə olanda `node_modules/next/dist/docs/`-a bax.
```

- [ ] **Addım 7: Minimal səhifə (test üçün)**

`src/app/globals.css`:

```css
@import "tailwindcss";
```

`src/app/[lang]/layout.tsx`:

```tsx
// Cache Components: params must be known at build time, otherwise the layout becomes request-time data.
export function generateStaticParams() {
  return [{ lang: "az" }, { lang: "en" }, { lang: "ru" }];
}

export default async function SiteLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  return (
    <html lang={lang}>
      <body>{children}</body>
    </html>
  );
}
```

`src/app/[lang]/page.tsx`:

```tsx
export default function HomePage() {
  return <main>Zavod.az</main>;
}
```

- [ ] **Addım 8: Yoxla**

```bash
npm run typecheck && npm run lint && npm run build
npm run dev
```

Gözlənilən: typecheck/lint/build xətasız. `http://localhost:3000/az` → "Zavod.az" yazısı (routing hələ yoxdur, Tapşırıq 5-də `/` işləyəcək).

- [ ] **Addım 9: Commit**

```bash
git add -A
git commit -m "chore: Next.js 16 layihəsinin qurulması

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

`git status` ilə yoxla ki, `.env.local` commit-ə düşməyib.

---

### Tapşırıq 2: Figma alətləri və dizayn token-ləri

**Fayllar:**
- Yarat: `scripts/figma/api.mts`, `scripts/figma/tokens-lib.mts`, `scripts/figma/export-tokens.mts`, `scripts/figma/inspect.mts`, `src/styles/tokens.css` (generasiya), `tests/unit/figma-tokens.test.ts`

**İnterfeyslər:**
- Verir:
  - `getFile(): Promise<FigmaFile>` (yerli cache ilə), `getNodes(ids: string[]): Promise<Record<string, { document: FigmaNode }>>`, `exportImages(ids: string[], opts: { format: "png" | "svg"; scale?: number }): Promise<Record<string, string>>`, `download(url: string, file: string): Promise<void>`, `findNode(root: FigmaNode, id: string): FigmaNode | undefined`
  - `parsePalette(texts: string[], scaleNames: string[]): Record<string, string>`, `resolveTextTokens(styles: FigmaTextStyle[], map: Record<string, string>): { tokens: TextToken[]; unknown: string[] }`, `textStyleKey(s: FigmaTextStyle): string`, `buildThemeCss(colors: Record<string, string>, texts: TextToken[]): string`
  - CSS sinifləri: `bg-brand-950`, `text-gray-500`, `text-body-md`, `text-subtitle-3-medium` və s. (aşağıdakı xəritə)

- [ ] **Addım 1: Uğursuz test yaz** — `tests/unit/figma-tokens.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildThemeCss,
  parsePalette,
  resolveTextTokens,
  textStyleKey,
} from "../../scripts/figma/tokens-lib.mts";

test("parsePalette reads step/hex pairs scale by scale", () => {
  const texts = ["50", "#f7f7f8", "100", "#ededf1", "50", "#f5f6fa", "950", "#1a1c29"];
  assert.deepEqual(parsePalette(texts, ["gray", "brand"]), {
    "gray-50": "#F7F7F8",
    "gray-100": "#EDEDF1",
    "brand-50": "#F5F6FA",
    "brand-950": "#1A1C29",
  });
});

test("parsePalette fails loudly when Figma has more scales than names", () => {
  assert.throws(() => parsePalette(["50", "#ffffff"], []), /add a name/);
});

test("textStyleKey separates same-named styles with different values", () => {
  const a = { name: "Body Text/Medium", fontSize: 16, letterSpacing: -0.16, fontWeight: 400, lineHeightPx: 24 };
  const b = { ...a, letterSpacing: 0 };
  assert.equal(textStyleKey(a), "Body Text/Medium|16|-0.16");
  assert.equal(textStyleKey(b), "Body Text/Medium|16|0");
});

test("resolveTextTokens maps known styles and reports unknown ones", () => {
  const styles = [
    { name: "H1", fontSize: 50, letterSpacing: -2, fontWeight: 500, lineHeightPx: 57.5 },
    { name: "H1", fontSize: 50, letterSpacing: -2, fontWeight: 500, lineHeightPx: 57.5 },
    { name: "New style", fontSize: 13, letterSpacing: 0, fontWeight: 400, lineHeightPx: 18 },
  ];
  const { tokens, unknown } = resolveTextTokens(styles, { "H1|50|-2": "h1" });
  assert.equal(tokens.length, 1);
  assert.deepEqual(tokens[0], { token: "h1", figma: "H1|50|-2", fontSize: 50, lineHeightPx: 57.5, letterSpacing: -2, fontWeight: 500 });
  assert.deepEqual(unknown, ["New style|13|0"]);
});

test("buildThemeCss writes Tailwind v4 theme variables", () => {
  const css = buildThemeCss({ "brand-950": "#1A1C29" }, [
    { token: "body-md", figma: "Body Text/Medium|16|-0.16", fontSize: 16, lineHeightPx: 24, letterSpacing: -0.16, fontWeight: 400 },
  ]);
  assert.match(css, /--color-brand-950: #1A1C29;/);
  assert.match(css, /--text-body-md: 16px;/);
  assert.match(css, /--text-body-md--line-height: 24px;/);
  assert.match(css, /--text-body-md--letter-spacing: -0.16px;/);
  assert.match(css, /--text-body-md--font-weight: 400;/);
});
```

- [ ] **Addım 2: Testi işlət, uğursuz olduğunu gör**

Run: `npm run test:unit`
Gözlənilən: FAIL — `Cannot find module '../../scripts/figma/tokens-lib.mts'`

- [ ] **Addım 3: `scripts/figma/tokens-lib.mts`**

```ts
// Pure helpers that turn Figma data into Tailwind v4 theme variables (tested in tests/unit).

export type FigmaTextStyle = {
  name: string;
  fontSize: number;
  lineHeightPx: number;
  letterSpacing: number;
  fontWeight: number;
};

export type TextToken = {
  token: string;
  figma: string;
  fontSize: number;
  lineHeightPx: number;
  letterSpacing: number;
  fontWeight: number;
};

const round = (n: number, digits = 3) => Math.round(n * 10 ** digits) / 10 ** digits;

/** Colour Palette frame texts come as "50", "#f7f7f8", "100", … one scale after another. */
export function parsePalette(texts: string[], scaleNames: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  let scale = -1;
  for (let i = 0; i + 1 < texts.length; i += 2) {
    const step = texts[i].trim();
    const hex = texts[i + 1].trim();
    if (!/^\d+$/.test(step) || !/^#[0-9a-f]{6}$/i.test(hex)) {
      throw new Error(`Unexpected palette pair: "${step}" "${hex}"`);
    }
    if (step === "50") scale++;
    const name = scaleNames[scale];
    if (!name) throw new Error(`Figma has more colour scales than names: add a name for scale #${scale + 1}`);
    out[`${name}-${step}`] = hex.toUpperCase();
  }
  return out;
}

/** Figma reuses style names with different values, so a style is identified by name + size + spacing. */
export function textStyleKey(s: FigmaTextStyle): string {
  return `${s.name}|${round(s.fontSize, 2)}|${round(s.letterSpacing)}`;
}

/** Applies the explicit name map; styles missing from the map are reported, never guessed. */
export function resolveTextTokens(styles: FigmaTextStyle[], map: Record<string, string>) {
  const tokens = new Map<string, TextToken>();
  const unknown = new Set<string>();
  for (const s of styles) {
    const key = textStyleKey(s);
    const token = map[key];
    if (!token) {
      unknown.add(key);
      continue;
    }
    if (!tokens.has(token)) {
      tokens.set(token, {
        token,
        figma: key,
        fontSize: round(s.fontSize, 2),
        lineHeightPx: round(s.lineHeightPx, 2),
        letterSpacing: round(s.letterSpacing),
        fontWeight: s.fontWeight,
      });
    }
  }
  return { tokens: [...tokens.values()], unknown: [...unknown].sort() };
}

export function buildThemeCss(colors: Record<string, string>, texts: TextToken[]): string {
  const lines = [
    "/* GENERATED by `npm run figma:tokens` from Figma — do not edit by hand. */",
    "@theme {",
    "  --color-*: initial;",
    "  --color-white: #FFFFFF;",
    "  --color-black: #000000;",
    "  --color-transparent: transparent;",
    "  --color-current: currentColor;",
  ];
  for (const [name, hex] of Object.entries(colors)) lines.push(`  --color-${name}: ${hex};`);
  lines.push("");
  for (const t of texts) {
    lines.push(`  /* ${t.figma} */`);
    lines.push(`  --text-${t.token}: ${t.fontSize}px;`);
    lines.push(`  --text-${t.token}--line-height: ${t.lineHeightPx}px;`);
    lines.push(`  --text-${t.token}--letter-spacing: ${t.letterSpacing}px;`);
    lines.push(`  --text-${t.token}--font-weight: ${t.fontWeight};`);
  }
  lines.push("}");
  return lines.join("\n") + "\n";
}
```

- [ ] **Addım 4: Testi işlət, keçdiyini gör**

Run: `npm run test:unit`
Gözlənilən: PASS (5 test)

- [ ] **Addım 5: `scripts/figma/api.mts`**

```ts
// Minimal Figma REST client for the design scripts. Token: FIGMA_TOKEN (.env.local).
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type FigmaColor = { r: number; g: number; b: number; a: number };
export type FigmaNode = {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  characters?: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  style?: { fontFamily: string; fontWeight: number; fontSize: number; lineHeightPx: number; letterSpacing: number; textCase?: string };
  styles?: Record<string, string>;
  fills?: { type: string; visible?: boolean; color?: FigmaColor; opacity?: number }[];
  [key: string]: unknown;
};
export type FigmaFile = {
  name: string;
  lastModified: string;
  document: FigmaNode;
  styles: Record<string, { name: string; styleType: string }>;
  components: Record<string, { name: string }>;
};

export const FILE_KEY = process.env.FIGMA_FILE_KEY ?? "iLz9wZPvZmcyxEWRKjMY4m";
const TOKEN = process.env.FIGMA_TOKEN;
const CACHE = "design/.cache/file.json";

async function figma<T>(path: string): Promise<T> {
  if (!TOKEN) throw new Error("FIGMA_TOKEN is not set (.env.local)");
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.figma.com/v1${path}`, { headers: { "X-Figma-Token": TOKEN } });
    if (res.status === 429 && attempt < 5) {
      const wait = Number(res.headers.get("retry-after")) || 2 ** attempt * 5;
      console.warn(`Figma rate limit — waiting ${wait}s`);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`Figma ${path}: ${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  }
}

/** Whole file (~80 MB). Reused for 10 minutes so several scripts in a row do not re-download it. */
export async function getFile(): Promise<FigmaFile> {
  const fresh = await stat(CACHE).then((s) => Date.now() - s.mtimeMs < 10 * 60_000, () => false);
  if (fresh) return JSON.parse(await readFile(CACHE, "utf8")) as FigmaFile;
  const file = await figma<FigmaFile>(`/files/${FILE_KEY}`);
  await mkdir(dirname(CACHE), { recursive: true });
  await writeFile(CACHE, JSON.stringify(file));
  return file;
}

export async function getNodes(ids: string[]) {
  const res = await figma<{ nodes: Record<string, { document: FigmaNode } | null> }>(
    `/files/${FILE_KEY}/nodes?ids=${encodeURIComponent(ids.join(","))}`,
  );
  const missing = ids.filter((id) => !res.nodes[id]);
  if (missing.length) throw new Error(`Figma nodes not found (renamed or deleted?): ${missing.join(", ")}`);
  return res.nodes as Record<string, { document: FigmaNode }>;
}

export async function exportImages(ids: string[], opts: { format: "png" | "svg"; scale?: number }) {
  const q = new URLSearchParams({ ids: ids.join(","), format: opts.format, scale: String(opts.scale ?? 1) });
  if (opts.format === "svg") q.set("svg_outline_text", "true");
  const res = await figma<{ images: Record<string, string | null> }>(`/images/${FILE_KEY}?${q}`);
  const missing = ids.filter((id) => !res.images[id]);
  if (missing.length) throw new Error(`Figma could not render: ${missing.join(", ")}`);
  return res.images as Record<string, string>;
}

export async function download(url: string, file: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

export function findNode(root: FigmaNode, id: string): FigmaNode | undefined {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const hit = findNode(child, id);
    if (hit) return hit;
  }
  return undefined;
}

export function walk(root: FigmaNode, visit: (n: FigmaNode) => void) {
  visit(root);
  for (const child of root.children ?? []) walk(child, visit);
}
```

- [ ] **Addım 6: `scripts/figma/export-tokens.mts`**

```ts
// Writes src/styles/tokens.css from Figma: colour scales (frame "Colour Palette") and every
// text style used anywhere in the file. Run again whenever the design changes.
import { writeFile } from "node:fs/promises";
import { findNode, getFile, walk, type FigmaNode } from "./api.mts";
import { buildThemeCss, parsePalette, resolveTextTokens, type FigmaTextStyle } from "./tokens-lib.mts";

const PALETTE_FRAME = "2:43";
/** Scales in the order they appear in the frame (Santas Gray, East Bay, red, green). */
const SCALES = ["gray", "brand", "red", "green"];
/** Colours used in the design that are not part of the palette frame. */
const EXTRA_COLORS: Record<string, string> = {
  star: "#F2CC50",
  success: "#5ECA83",
  "whatsapp-bg": "#F2FBF5",
  "whatsapp-border": "#C3EFD1",
  "whatsapp-text": "#1C4B2E",
};
/** Figma style (name|size|letter-spacing) → token. New styles must be added here on purpose. */
const TEXT_MAP: Record<string, string> = {
  "H1|50|-2": "h1",
  "H2|40|-1.2": "h2",
  "H3|32|-0.96": "h3",
  "H4|28|-0.56": "h4",
  "H5|24|-0.48": "h5",
  "Mob/H1|28|-1.12": "mob-h1",
  "Mob/H2|24|-0.72": "mob-h2",
  "Mob/Subtitle|18|-0.36": "mob-subtitle",
  "Mob/Subtitle 2|16|-0.32": "mob-subtitle-2",
  "Subtitle 1/Medium|22|-0.44": "subtitle-1-medium",
  "Subtitle 1/Regular|22|-0.44": "subtitle-1",
  "Subtitle 2/Medium|20|-0.4": "subtitle-2-medium",
  "Subtitle 2/Regular|20|-0.4": "subtitle-2",
  "Subtitle 2/Medium|16|0": "subtitle-2s-medium",
  "Subtitle 2/Regular|16|0": "subtitle-2s",
  "Subtitle 2/SemiBold|16|0": "subtitle-2s-semibold",
  "Subtitle 3/Medium|18|-0.36": "subtitle-3-medium",
  "Subtitle 3/Regular|18|-0.36": "subtitle-3",
  "Body Text/Large|18|-0.36": "body-lg",
  "Body Text/Medium|16|-0.16": "body-md",
  "Body Text/Medium|16|0": "body-md-flat",
  "Body Text/Small|14|-0.14": "body-sm",
  "Body Text/Small|14|0": "body-sm-flat",
  "Caption|12|0.048": "caption",
  "Caption|12|-0.12": "caption-tight",
  "Label/Paragraph/X Small|12|0": "label-xs",
  "Overline|10|-0.1": "overline",
};

const file = await getFile();
const frame = findNode(file.document, PALETTE_FRAME);
if (!frame) throw new Error(`Palette frame ${PALETTE_FRAME} not found`);

const paletteTexts: string[] = [];
walk(frame, (n) => n.type === "TEXT" && n.characters && paletteTexts.push(n.characters));
const colors = { ...parsePalette(paletteTexts, SCALES), ...EXTRA_COLORS };

const styles: FigmaTextStyle[] = [];
walk(file.document, (n: FigmaNode) => {
  const styleId = n.styles?.text;
  if (n.type !== "TEXT" || !styleId || !n.style) return;
  const name = file.styles[styleId]?.name;
  if (name) styles.push({ name, ...n.style });
});

const { tokens, unknown } = resolveTextTokens(styles, TEXT_MAP);
if (unknown.length) {
  console.error("New Figma text styles — add them to TEXT_MAP:\n  " + unknown.join("\n  "));
  process.exit(1);
}

await writeFile("src/styles/tokens.css", buildThemeCss(colors, tokens));
console.log(`tokens.css: ${Object.keys(colors).length} colours, ${tokens.length} text styles (Figma ${file.lastModified})`);
```

- [ ] **Addım 7: `scripts/figma/inspect.mts`** — hər səhifədən əvvəl dəqiq ölçüləri götürmək üçün

```ts
// Prints a Figma node tree with exact layout values: position relative to the root, size,
// auto-layout (gap, padding, alignment), radius, fills, strokes, effects and text styles.
//   npm run figma:inspect -- 143:1693 [depth=6]
import { getNodes, type FigmaColor, type FigmaNode } from "./api.mts";

const [id, depthArg] = process.argv.slice(2);
if (!id) throw new Error("Usage: npm run figma:inspect -- <node-id> [depth]");
const maxDepth = Number(depthArg ?? 6);

const hex = (c: FigmaColor, opacity = 1) => {
  const h = "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
  const a = c.a * opacity;
  return a < 1 ? `${h}@${a.toFixed(2)}` : h;
};

function line(n: FigmaNode, depth: number, ox: number, oy: number): string {
  const b = n.absoluteBoundingBox;
  const at = b ? `[${Math.round(b.x - ox)},${Math.round(b.y - oy)} ${Math.round(b.width)}x${Math.round(b.height)}]` : "";
  const parts = [`${"  ".repeat(depth)}${n.type} "${n.name}" ${n.id} ${at}`];
  if (n.visible === false) parts.push("HIDDEN");
  const al = n as Record<string, unknown>;
  if (al.layoutMode && al.layoutMode !== "NONE") {
    const pad = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"].map((k) => al[k] ?? 0).join("/");
    parts.push(`auto:${al.layoutMode} gap=${al.itemSpacing ?? 0} pad=${pad} main=${al.primaryAxisAlignItems ?? "MIN"} cross=${al.counterAxisAlignItems ?? "MIN"}`);
  }
  if (al.cornerRadius) parts.push(`r=${al.cornerRadius}`);
  if (al.rectangleCornerRadii) parts.push(`r=${al.rectangleCornerRadii}`);
  const fills = (n.fills ?? []).filter((f) => f.visible !== false);
  if (fills.length) parts.push("fill=" + fills.map((f) => (f.color ? hex(f.color, f.opacity) : f.type)).join(","));
  const strokes = ((al.strokes as FigmaNode["fills"]) ?? []).filter((f) => f.visible !== false);
  if (strokes.length) parts.push(`stroke=${strokes.map((s) => (s.color ? hex(s.color) : s.type)).join(",")}/${al.strokeWeight}${al.individualStrokeWeights ? JSON.stringify(al.individualStrokeWeights) : ""} ${al.strokeAlign ?? ""}`);
  const effects = ((al.effects as { type: string; visible?: boolean; offset?: { x: number; y: number }; radius: number; spread?: number; color?: FigmaColor }[]) ?? []).filter((e) => e.visible !== false);
  if (effects.length) parts.push("fx=" + effects.map((e) => `${e.type}(${e.offset?.x ?? 0},${e.offset?.y ?? 0},${e.radius},${e.spread ?? 0},${e.color ? hex(e.color) : ""})`).join(","));
  if (n.type === "TEXT" && n.style) {
    const s = n.style;
    parts.push(`"${(n.characters ?? "").slice(0, 50)}" ${s.fontWeight} ${s.fontSize}/${Math.round(s.lineHeightPx * 100) / 100} ls=${Math.round(s.letterSpacing * 1000) / 1000}${s.textCase ? " " + s.textCase : ""}`);
  }
  return parts.join(" ");
}

const nodes = await getNodes([id]);
const root = nodes[id].document;
const box = root.absoluteBoundingBox ?? { x: 0, y: 0 };
const out: string[] = [];
(function visit(n: FigmaNode, depth: number) {
  if (n.type === "VECTOR" || n.type === "BOOLEAN_OPERATION") return;
  out.push(line(n, depth, box.x, box.y));
  if (depth < maxDepth) for (const c of n.children ?? []) visit(c, depth + 1);
})(root, 0);
console.log(out.join("\n"));
```

- [ ] **Addım 8: Token-ləri generasiya et və yoxla**

```bash
npm run figma:tokens
grep -c -- "--color-" src/styles/tokens.css
grep -- "--color-brand-950: #1A1C29;" src/styles/tokens.css
grep -- "--text-subtitle-3-medium: 18px;" src/styles/tokens.css
npm run figma:inspect -- 143:1693 2
```

Gözlənilən: "tokens.css: 49 colours, 27 text styles"; grep sətirləri tapılır; inspect Header-in ağacını çap edir (`FRAME "Frame 9" … auto:VERTICAL gap=25`). Əgər skript "New Figma text styles" ilə dayanırsa, dizayner yeni style əlavə edib: xəritəyə ad əlavə et və yenidən işlət.

- [ ] **Addım 9: Commit**

```bash
git add scripts/figma tests/unit/figma-tokens.test.ts src/styles/tokens.css
git commit -m "feat: Figma API alətləri və dizayn token-ləri

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 3: Figma-dan ikon və loqo export-u

**Fayllar:**
- Yarat: `scripts/figma/export-assets.mts`, `public/icons/*.svg`, `public/brand/logo-*.webp`, `src/components/ui/icon.tsx`, `src/components/ui/logo.tsx`

**İnterfeyslər:**
- Verir:
  - `<Icon name={IconName} size={number} className? />` — `IconName = "phone" | "user-white" | "caret-down" | "caret-right" | "whatsapp" | "list" | "close"`
  - `<SocialIcon name={SocialName} />` (40×40 dairə) — `SocialName = "facebook" | "instagram" | "linkedin" | "x" | "youtube" | "tiktok"`
  - `<Logo variant={"header" | "header-mobile" | "footer" | "footer-mobile"} />`

- [ ] **Addım 1: `scripts/figma/export-assets.mts`**

```ts
// Exports icons (SVG, exactly as drawn) and the logo (PNG 1x/2x/3x → lossless WebP) from Figma.
// Node ids are the instances used in Header / Footer / mobile menu; when the designer replaces a
// node, the script stops with "not found" — update the id with `npm run figma:inspect`.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { download, exportImages } from "./api.mts";

const ICONS: Record<string, string> = {
  phone: "I143:1693;129:1658;12:1143",
  "user-white": "I143:1693;129:1671;12:293",
  "caret-down": "I143:1693;129:1670",
  "caret-right": "144:4009",
  whatsapp: "I143:1693;129:1661",
  list: "685:20718",
  close: "682:20707",
  // Footer social buttons: the whole 40×40 circle (background + glyph).
  "social-facebook": "I143:2121;704:20430",
  "social-instagram": "I143:2121;704:20432",
  "social-linkedin": "I143:2121;704:20434",
  "social-x": "I143:2121;704:20436",
  "social-youtube": "I143:2121;704:20444",
  "social-tiktok": "I143:2121;704:20446",
};

const LOGOS: Record<string, string> = {
  header: "I143:1693;129:1655",
  "header-mobile": "685:20712",
  footer: "I143:2121;52:3439",
  "footer-mobile": "I685:21139;682:20130",
};

const svgUrls = await exportImages(Object.values(ICONS), { format: "svg" });
for (const [name, id] of Object.entries(ICONS)) {
  await download(svgUrls[id], `public/icons/${name}.svg`);
}
console.log(`icons: ${Object.keys(ICONS).length}`);

await mkdir("design/.cache/logo", { recursive: true });
for (const scale of [1, 2, 3]) {
  const urls = await exportImages(Object.values(LOGOS), { format: "png", scale });
  for (const [name, id] of Object.entries(LOGOS)) {
    const png = `design/.cache/logo/${name}@${scale}x.png`;
    await download(urls[id], png);
    await mkdir("public/brand", { recursive: true });
    await writeFile(`public/brand/logo-${name}@${scale}x.webp`, await sharp(await readFile(png)).webp({ lossless: true }).toBuffer());
  }
}
await rm("design/.cache/logo", { recursive: true });
console.log(`logos: ${Object.keys(LOGOS).length} × 3 scales`);
```

- [ ] **Addım 2: İşlət və yoxla**

```bash
npm run figma:assets
ls public/icons public/brand
```

Gözlənilən: `public/icons`-da 13 SVG, `public/brand`-da 12 WebP. `phone.svg`-ni brauzerdə aç — Figma-dakı telefon ikonu görünməlidir.

- [ ] **Addım 3: `src/components/ui/icon.tsx`**

```tsx
// Figma icons as static files: no JS, cached forever, colours exactly as drawn.
export type IconName = "phone" | "user-white" | "caret-down" | "caret-right" | "whatsapp" | "list" | "close";
export type SocialName = "facebook" | "instagram" | "linkedin" | "x" | "youtube" | "tiktok";

export function Icon({ name, size, className }: { name: IconName; size: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG from Figma, already optimal
    <img src={`/icons/${name}.svg`} width={size} height={size} alt="" aria-hidden className={className} />
  );
}

export function SocialIcon({ name }: { name: SocialName }) {
  // eslint-disable-next-line @next/next/no-img-element -- static SVG from Figma (40×40 circle)
  return <img src={`/icons/social-${name}.svg`} width={40} height={40} alt="" aria-hidden />;
}
```

- [ ] **Addım 4: `src/components/ui/logo.tsx`**

```tsx
const SIZES = {
  header: [167, 87],
  "header-mobile": [88, 46],
  footer: [206, 113],
  "footer-mobile": [113, 61],
} as const;

export type LogoVariant = keyof typeof SIZES;

/** Figma logo (PNG in the design file) as lossless WebP for 1x / 2x / 3x screens. */
export function Logo({ variant, priority = false }: { variant: LogoVariant; priority?: boolean }) {
  const [width, height] = SIZES[variant];
  const src = (scale: number) => `/brand/logo-${variant}@${scale}x.webp`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pre-sized brand asset, no optimisation needed
    <img
      src={src(1)}
      srcSet={`${src(1)} 1x, ${src(2)} 2x, ${src(3)} 3x`}
      width={width}
      height={height}
      alt="Zavod.az"
      fetchPriority={priority ? "high" : undefined}
      className="block"
    />
  );
}
```

- [ ] **Addım 5: Commit**

```bash
npm run typecheck
git add scripts/figma/export-assets.mts public src/components/ui
git commit -m "feat: Figma-dan ikon və loqo export-u

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 4: Əsas stil və Inter şrifti

**Fayllar:**
- Yarat: `src/lib/fonts.ts`
- Dəyiş: `src/app/globals.css`, `src/app/[lang]/layout.tsx`

**İnterfeyslər:**
- İstifadə edir: `src/styles/tokens.css` (Tapşırıq 2)
- Verir: `inter` (next/font), `font-sans` = Inter, `.container-site` (max 1440, kənar boşluq 16 / 60 px)

- [ ] **Addım 1: `src/lib/fonts.ts`**

```ts
import { Inter } from "next/font/google";

/**
 * Inter (the only font in the Figma file), self-hosted by next/font — no request to Google
 * at runtime. latin + latin-ext (Azerbaijani letters) are preloaded; cyrillic is still
 * available for Russian pages through unicode-range.
 */
export const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});
```

- [ ] **Addım 2: `src/app/globals.css`**

```css
@import "tailwindcss";
@import "../styles/tokens.css";

@theme inline {
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
}

@layer base {
  html {
    -webkit-text-size-adjust: 100%;
    text-rendering: optimizeLegibility;
  }
  body {
    @apply bg-white font-sans text-brand-950 antialiased;
  }
}

/* Page width from Figma: 1440 frame, 60px side padding (desktop) / 320 frame, 16px (mobile). */
@utility container-site {
  margin-inline: auto;
  width: 100%;
  max-width: 1440px;
  padding-inline: 16px;
  @media (width >= 1024px) {
    padding-inline: 60px;
  }
}
```

- [ ] **Addım 3: Layout-a şrifti qoş** — `src/app/[lang]/layout.tsx`

```tsx
import { inter } from "@/lib/fonts";
import "../globals.css";

export default async function SiteLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  return (
    <html lang={lang} className={inter.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
```

- [ ] **Addım 4: Yoxla**

`src/app/[lang]/page.tsx`-ə müvəqqəti `<h1 className="text-h1 text-brand-950">Zavod.az</h1>` yaz, `npm run dev`, `http://localhost:3000/az`. DevTools → Computed: `font-family` Inter, `font-size: 50px`, `line-height: 57.5px`, `letter-spacing: -2px`, `color: rgb(26, 28, 41)`. Sonra müvəqqəti h1-i sil (`<main>Zavod.az</main>` qalsın).

- [ ] **Addım 5: Commit**

```bash
npm run build
git add src/lib/fonts.ts src/app
git commit -m "feat: Inter şrifti və əsas stil

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 5: Dillər və routing

**Fayllar:**
- Yarat: `src/i18n/config.ts`, `src/i18n/routes.ts`, `src/i18n/dictionaries/{index,az,en,ru}.ts`, `src/proxy.ts`, `src/app/[lang]/not-found.tsx`, `src/app/[lang]/[...rest]/page.tsx`, `tests/unit/routes.test.ts`
- Dəyiş: `src/app/[lang]/layout.tsx`

**İnterfeyslər:**
- Verir:
  - `locales`, `Locale = "az" | "en" | "ru"`, `defaultLocale`, `Localized<T>`, `hasLocale(v: string): v is Locale`
  - `staticRoutes`, `RouteKey`, `href(route: RouteKey, locale: Locale, ...rest: string[]): string`, `alternates(route: RouteKey): Localized`, `resolvePublicPath(pathname: string): ResolvedPath`, `switchLocalePath(pathname: string, target: Locale): string`
  - `dict(lang: Locale): Dictionary`

- [ ] **Addım 1: Uğursuz test yaz** — `tests/unit/routes.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { locales } from "../../src/i18n/config.ts";
import { href, resolvePublicPath, staticRoutes, switchLocalePath, type RouteKey } from "../../src/i18n/routes.ts";

test("href builds public URLs (AZ without prefix)", () => {
  assert.equal(href("home", "az"), "/");
  assert.equal(href("home", "en"), "/en");
  assert.equal(href("catalog", "az"), "/kataloq");
  assert.equal(href("catalog", "ru"), "/ru/katalog");
  assert.equal(href("vacancies", "az", "middle-designer-12"), "/vakansiyalar/middle-designer-12");
});

test("resolvePublicPath rewrites, redirects and rejects", () => {
  assert.deepEqual(resolvePublicPath("/"), { kind: "rewrite", internal: "/az" });
  assert.deepEqual(resolvePublicPath("/en"), { kind: "rewrite", internal: "/en" });
  assert.deepEqual(resolvePublicPath("/kataloq"), { kind: "rewrite", internal: "/az/catalog" });
  assert.deepEqual(resolvePublicPath("/kataloq/x"), { kind: "rewrite", internal: "/az/catalog/x" });
  assert.deepEqual(resolvePublicPath("/az/kataloq"), { kind: "redirect", to: "/kataloq" });
  assert.deepEqual(resolvePublicPath("/en/kataloq"), { kind: "notFound", locale: "en" });
  assert.deepEqual(resolvePublicPath("/yoxdur"), { kind: "notFound", locale: "az" });
});

test("switchLocalePath keeps the page when changing language", () => {
  assert.equal(switchLocalePath("/kataloq", "en"), "/en/catalog");
  assert.equal(switchLocalePath("/en/catalog", "az"), "/kataloq");
  assert.equal(switchLocalePath("/ru", "az"), "/");
  assert.equal(switchLocalePath("/yoxdur", "ru"), "/ru");
});

test("every language has unique URL segments", () => {
  for (const l of locales) {
    const segments = (Object.keys(staticRoutes) as RouteKey[]).map((k) => staticRoutes[k][l]).filter(Boolean);
    assert.equal(new Set(segments).size, segments.length, `duplicate segment in ${l}`);
  }
});
```

- [ ] **Addım 2: Testi işlət, uğursuz olduğunu gör**

Run: `npm run test:unit`
Gözlənilən: FAIL — `Cannot find module '../../src/i18n/config.ts'`

- [ ] **Addım 3: `src/i18n/config.ts`**

```ts
export const locales = ["az", "en", "ru"] as const;
export type Locale = (typeof locales)[number];

/** AZ is served without a URL prefix (`/`), EN and RU under `/en` and `/ru`. */
export const defaultLocale: Locale = "az";

/** A value stored once per language — every admin-edited text uses this shape. */
export type Localized<T = string> = Record<Locale, T>;

export const hasLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);
```

- [ ] **Addım 4: `src/i18n/routes.ts`**

```ts
import { defaultLocale, hasLocale, locales, type Locale, type Localized } from "./config";

/**
 * Pages with a fixed URL. The key is the internal folder under `app/[lang]/`, the value is
 * the public segment per language (spec 5). Dynamic segments (factory types, slugs) are
 * added in their own steps.
 */
export const staticRoutes = {
  home: { az: "", en: "", ru: "" },
  catalog: { az: "kataloq", en: "catalog", ru: "katalog" },
  news: { az: "xeberler", en: "news", ru: "novosti" },
  vacancies: { az: "vakansiyalar", en: "vacancies", ru: "vakansii" },
  tariffs: { az: "tarifler", en: "pricing", ru: "tarify" },
  contact: { az: "elaqe", en: "contact", ru: "kontakty" },
  help: { az: "yardim", en: "help", ru: "pomoshch" },
  terms: { az: "istifadeci-qaydalari", en: "terms-of-use", ru: "pravila" },
  privacy: { az: "mexfilik-siyaseti", en: "privacy-policy", ru: "konfidencialnost" },
  search: { az: "axtaris", en: "search", ru: "poisk" },
  login: { az: "daxil-ol", en: "login", ru: "vhod" },
  register: { az: "qeydiyyat", en: "register", ru: "registraciya" },
  cabinet: { az: "kabinet", en: "cabinet", ru: "lichnyj-kabinet" },
} as const satisfies Record<string, Localized>;

export type RouteKey = keyof typeof staticRoutes;

/** Public URL of a page (plus optional extra segments) in a language. */
export function href(route: RouteKey, locale: Locale, ...rest: string[]): string {
  const parts = [locale === defaultLocale ? "" : locale, staticRoutes[route][locale], ...rest].filter(Boolean);
  return "/" + parts.join("/");
}

/** One page in every language — for hreflang. */
export function alternates(route: RouteKey): Localized {
  return Object.fromEntries(locales.map((l) => [l, href(route, l)])) as Localized;
}

export type ResolvedPath =
  | { kind: "rewrite"; internal: string }
  | { kind: "redirect"; to: string }
  | { kind: "notFound"; locale: Locale };

/**
 * Public pathname → internal `/[lang]/<route>/...`. Only the segment of the matching
 * language is accepted, so every page has exactly one URL per language (SEO).
 */
export function resolvePublicPath(pathname: string): ResolvedPath {
  const segments = pathname.split("/").filter(Boolean);
  let locale: Locale = defaultLocale;

  if (segments[0] && hasLocale(segments[0])) {
    if (segments[0] === defaultLocale) return { kind: "redirect", to: "/" + segments.slice(1).join("/") };
    locale = segments.shift() as Locale;
  }

  const [first, ...rest] = segments;
  if (!first) return { kind: "rewrite", internal: `/${locale}` };

  const route = (Object.keys(staticRoutes) as RouteKey[]).find(
    (key) => key !== "home" && staticRoutes[key][locale] === first,
  );
  if (!route) return { kind: "notFound", locale };
  return { kind: "rewrite", internal: ["", locale, route, ...rest].join("/") };
}

/** Same page in another language (used by the language switcher at click time). */
export function switchLocalePath(pathname: string, target: Locale): string {
  const resolved = resolvePublicPath(pathname);
  if (resolved.kind !== "rewrite") return href("home", target);
  const [, , route, ...rest] = resolved.internal.split("/");
  if (!route) return href("home", target);
  return href(route as RouteKey, target, ...rest);
}
```

- [ ] **Addım 5: Lüğətlər**

`src/i18n/dictionaries/az.ts`:

```ts
export const az = {
  nav: {
    home: "Ana səhifə",
    news: "Xəbərlər",
    catalog: "Kataloq",
    tariffs: "Tariflər",
    vacancies: "Vakansiyalar",
    contact: "Əlaqə",
    services: "Xidmətlər",
  },
  header: {
    mainMenu: "Əsas menyu",
    whatsapp: "Birbaşa Whatsapp-a yazın",
    login: "Daxil ol",
    openMenu: "Menyunu aç",
    closeMenu: "Menyunu bağla",
    language: "Dil",
  },
  footer: {
    follow: "Bizi izlə",
    address: "Ünvan",
    phone: "Telefon",
    terms: "İstifadəçi qaydaları",
    help: "Yardım",
    privacy: "Məxfilik siyasəti",
  },
  notFound: { title: "Səhifə tapılmadı", back: "Ana səhifəyə qayıt" },
  languages: { az: "Az", en: "En", ru: "Ru" },
};

export type Dictionary = typeof az;
```

`src/i18n/dictionaries/en.ts`:

```ts
import type { Dictionary } from "./az";

export const en: Dictionary = {
  nav: {
    home: "Home",
    news: "News",
    catalog: "Catalog",
    tariffs: "Pricing",
    vacancies: "Vacancies",
    contact: "Contact",
    services: "Services",
  },
  header: {
    mainMenu: "Main menu",
    whatsapp: "Write to us on WhatsApp",
    login: "Log in",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    language: "Language",
  },
  footer: {
    follow: "Follow us",
    address: "Address",
    phone: "Phone",
    terms: "Terms of use",
    help: "Help",
    privacy: "Privacy policy",
  },
  notFound: { title: "Page not found", back: "Back to home" },
  languages: { az: "Az", en: "En", ru: "Ru" },
};
```

`src/i18n/dictionaries/ru.ts`:

```ts
import type { Dictionary } from "./az";

export const ru: Dictionary = {
  nav: {
    home: "Главная",
    news: "Новости",
    catalog: "Каталог",
    tariffs: "Тарифы",
    vacancies: "Вакансии",
    contact: "Контакты",
    services: "Услуги",
  },
  header: {
    mainMenu: "Главное меню",
    whatsapp: "Написать в WhatsApp",
    login: "Войти",
    openMenu: "Открыть меню",
    closeMenu: "Закрыть меню",
    language: "Язык",
  },
  footer: {
    follow: "Мы в соцсетях",
    address: "Адрес",
    phone: "Телефон",
    terms: "Правила использования",
    help: "Помощь",
    privacy: "Политика конфиденциальности",
  },
  notFound: { title: "Страница не найдена", back: "На главную" },
  languages: { az: "Az", en: "En", ru: "Ru" },
};
```

`src/i18n/dictionaries/index.ts`:

```ts
import type { Locale } from "../config";
import { az, type Dictionary } from "./az";
import { en } from "./en";
import { ru } from "./ru";

const all: Record<Locale, Dictionary> = { az, en, ru };

export const dict = (lang: Locale): Dictionary => all[lang];
export type { Dictionary };
```

- [ ] **Addım 6: `src/proxy.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { resolvePublicPath } from "@/i18n/routes";

export function proxy(request: NextRequest) {
  const resolved = resolvePublicPath(request.nextUrl.pathname);
  const url = request.nextUrl.clone();
  switch (resolved.kind) {
    case "redirect":
      url.pathname = resolved.to;
      return NextResponse.redirect(url, 308);
    case "rewrite":
      url.pathname = resolved.internal;
      return NextResponse.rewrite(url);
    case "notFound":
      // No such route: Next renders app/[lang]/not-found.tsx with status 404.
      url.pathname = `/${resolved.locale}/__not-found`;
      return NextResponse.rewrite(url);
  }
}

export const config = {
  // Site pages only: skip admin, API, Next internals and any file with an extension.
  matcher: ["/((?!admin|api|_next|.*\\..*).*)"],
};
```

- [ ] **Addım 7: Layout-da dil yoxlaması və 404**

`src/app/[lang]/layout.tsx`:

```tsx
import { notFound } from "next/navigation";
import { hasLocale, locales } from "@/i18n/config";
import { inter } from "@/lib/fonts";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function SiteLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <html lang={lang} className={inter.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
```

`src/app/[lang]/[...rest]/page.tsx` — mövcud olmayan hər daxili yol (məs. `/az/__not-found` və ya hələ yazılmamış `/az/catalog`) bu segmentin 404-ünə düşür, beləcə Header/Footer düzgün dildə qalır:

```tsx
import { notFound } from "next/navigation";

export default function CatchAll() {
  notFound();
}
```

`src/app/[lang]/not-found.tsx` (Figma-da 404 yoxdur — token-lərlə sadə səhifə). `not-found.tsx` `params` almır, dil `useParams()` ilə götürülür:

```tsx
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { defaultLocale, hasLocale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { href } from "@/i18n/routes";

export default function NotFound() {
  const param = useParams<{ lang?: string }>().lang ?? "";
  const lang = hasLocale(param) ? param : defaultLocale;
  const t = dict(lang);
  return (
    <main className="container-site flex flex-col items-start gap-6 py-[120px]">
      <p className="text-h1 text-brand-950">404</p>
      <h1 className="text-h4 text-brand-950">{t.notFound.title}</h1>
      <Link href={href("home", lang)} className="text-body-md text-brand-700 underline">
        {t.notFound.back}
      </Link>
    </main>
  );
}
```

- [ ] **Addım 8: Testləri işlət**

Run: `npm run test:unit`
Gözlənilən: PASS (routes 4 test + tokens 5 test)

- [ ] **Addım 9: Brauzerdə yoxla**

```bash
npm run build && npx next start -p 3100
```

- `http://localhost:3100/` → "Zavod.az", `<html lang="az">`
- `http://localhost:3100/en` → `<html lang="en">`
- `http://localhost:3100/az` → 308 → `/`
- `http://localhost:3100/yoxdur` → 404, "Səhifə tapılmadı"
- `http://localhost:3100/en/yoxdur` → 404, "Page not found"

- [ ] **Addım 10: Commit**

```bash
git add src/i18n src/proxy.ts src/app tests/unit/routes.test.ts
git commit -m "feat: 3 dilli routing (AZ prefikssiz, /en, /ru) və 404

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 6: Baza (PostgreSQL + Drizzle)

**Fayllar:**
- Yarat: `drizzle.config.ts`, `src/db/schema.ts`, `src/db/index.ts`, `drizzle/0000_*.sql` (generasiya)

**İnterfeyslər:**
- Verir: `db` (Drizzle klienti), cədvəllər `users`, `sessions`, `cacheTags`, `siteSettings`, `rateLimits`; enum `userRole = "admin" | "factory"`, `userStatus = "active" | "blocked"`.

- [ ] **Addım 1: Bazanı qaldır**

```bash
docker compose -f docker-compose.dev.yml up -d
```

- [ ] **Addım 2: `drizzle.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read .env.local on its own.
try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Addım 3: `src/db/schema.ts`**

```ts
import { bigint, boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
```

- [ ] **Addım 4: `src/db/index.ts`**

```ts
import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

// One pool per process (≤10 connections: shared hosting limit); reused across hot reloads in dev.
const client = globalForDb.pg ?? postgres(process.env.DATABASE_URL!, { max: 10, idle_timeout: 20, prepare: true });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
```

- [ ] **Addım 5: Migration generasiya et və tətbiq et**

```bash
npm run db:generate
npm run db:migrate
docker compose -f docker-compose.dev.yml exec db psql -U zavod -c "\dt"
```

Gözlənilən: `drizzle/0000_*.sql` yaranır; `\dt` 5 cədvəl göstərir: `cache_tags, rate_limits, sessions, site_settings, users` (+ `__drizzle_migrations` drizzle sxemində).

- [ ] **Addım 6: Commit**

```bash
npm run typecheck
git add drizzle.config.ts src/db drizzle
git commit -m "feat: PostgreSQL + Drizzle, ilk cədvəllər

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 7: Cache teqləri və sayt ayarları (data)

**Fayllar:**
- Yarat: `src/lib/cache/tags.ts`, `src/lib/cache/tag-sync.ts`, `src/instrumentation.ts`, `src/features/settings/schema.ts`, `src/features/settings/queries.ts`, `tests/unit/settings.test.ts`

**İnterfeyslər:**
- İstifadə edir: `db`, `cacheTags`, `siteSettings` (Tapşırıq 6), `Localized` (Tapşırıq 5)
- Verir:
  - `invalidateTags(tags: Iterable<string>, mode?: "action" | "route"): Promise<void>`
  - `SETTINGS_TAG = "settings"`
  - `siteSettingsSchema`, `SiteSettings`, `defaultSiteSettings`, `mergeSettings(stored: unknown): SiteSettings`, `parseSettingsForm(form: FormData): { ok: true; data: SiteSettings } | { ok: false; errors: Record<string, string> }`, `whatsappHref(number: string): string`, `telHref(phone: string): string`
  - `getSiteSettings(): Promise<SiteSettings>` (cache-lənir, teq `settings`)

- [ ] **Addım 1: Uğursuz test yaz** — `tests/unit/settings.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultSiteSettings,
  mergeSettings,
  parseSettingsForm,
  telHref,
  whatsappHref,
} from "../../src/features/settings/schema.ts";

test("defaults are the texts drawn in Figma", () => {
  assert.equal(defaultSiteSettings.phone, "+994 000 00 00");
  assert.equal(defaultSiteSettings.address.az, "Lorem ipsum street 00, AZ 000");
  assert.equal(defaultSiteSettings.copyright.az, "©Bütün hüquqlar qorunur. Zavod.az, 2025");
});

test("mergeSettings fills missing fields from defaults", () => {
  const merged = mergeSettings({ phone: "+994 12 555 55 55" });
  assert.equal(merged.phone, "+994 12 555 55 55");
  assert.equal(merged.email, defaultSiteSettings.email);
});

test("mergeSettings falls back to defaults on broken data", () => {
  assert.deepEqual(mergeSettings({ phone: 42 }), defaultSiteSettings);
  assert.deepEqual(mergeSettings(undefined), defaultSiteSettings);
});

test("parseSettingsForm validates and normalises", () => {
  const form = new FormData();
  form.set("phone", " +994 12 555 55 55 ");
  form.set("phone2", "");
  form.set("whatsapp", "+994 50 123 45 67");
  form.set("email", "info@zavod.az");
  for (const l of ["az", "en", "ru"]) {
    form.set(`address.${l}`, "Bakı");
    form.set(`copyright.${l}`, "© Zavod.az");
  }
  for (const s of ["facebook", "instagram", "linkedin", "x", "youtube", "tiktok"]) form.set(`socials.${s}`, "");
  form.set("socials.facebook", "https://facebook.com/zavod.az");
  const res = parseSettingsForm(form);
  assert.ok(res.ok);
  assert.equal(res.data.phone, "+994 12 555 55 55");
  assert.equal(res.data.whatsapp, "+994501234567");
  assert.equal(res.data.socials.facebook, "https://facebook.com/zavod.az");
});

test("parseSettingsForm reports field errors", () => {
  const form = new FormData();
  form.set("email", "not-an-email");
  const res = parseSettingsForm(form);
  assert.equal(res.ok, false);
  if (!res.ok) assert.ok(res.errors.email);
});

test("link helpers", () => {
  assert.equal(whatsappHref("+994501234567"), "https://wa.me/994501234567");
  assert.equal(telHref("+994 12 555 55 55"), "tel:+994125555555");
});
```

- [ ] **Addım 2: Testi işlət, uğursuz olduğunu gör**

Run: `npm run test:unit`
Gözlənilən: FAIL — `Cannot find module '../../src/features/settings/schema.ts'`

- [ ] **Addım 3: `src/features/settings/schema.ts`**

```ts
import { z } from "zod";
import { locales, type Localized } from "@/i18n/config";

const localized = (max: number) =>
  z.object(Object.fromEntries(locales.map((l) => [l, z.string().trim().max(max)])) as Record<keyof Localized, z.ZodString>);
const urlOrEmpty = z.union([z.literal(""), z.url({ protocol: /^https?$/ })]);

export const SOCIALS = ["facebook", "instagram", "linkedin", "x", "youtube", "tiktok"] as const;
export type SocialKey = (typeof SOCIALS)[number];

export const siteSettingsSchema = z.object({
  phone: z.string().trim().min(5).max(30),
  phone2: z.string().trim().max(30),
  whatsapp: z
    .string()
    .transform((v) => v.replace(/[\s()-]/g, ""))
    .pipe(z.string().regex(/^\+?\d{9,15}$/, "Nömrə formatı: +994501234567")),
  email: z.email("E-mail düzgün deyil"),
  address: localized(200),
  copyright: localized(120),
  socials: z.object(Object.fromEntries(SOCIALS.map((s) => [s, urlOrEmpty])) as Record<SocialKey, typeof urlOrEmpty>),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

const same = (text: string): Localized => ({ az: text, en: text, ru: text });

/** Exactly the texts drawn in Figma, so a fresh install (and the visual test) matches the design. */
export const defaultSiteSettings: SiteSettings = {
  phone: "+994 000 00 00",
  phone2: "+994 000 00 00",
  whatsapp: "+994000000000",
  email: "youremailhere@partner.az",
  address: same("Lorem ipsum street 00, AZ 000"),
  copyright: {
    az: "©Bütün hüquqlar qorunur. Zavod.az, 2025",
    en: "©All rights reserved. Zavod.az, 2025",
    ru: "©Все права защищены. Zavod.az, 2025",
  },
  socials: {
    facebook: "https://www.facebook.com/",
    instagram: "https://www.instagram.com/",
    linkedin: "https://www.linkedin.com/",
    x: "https://x.com/",
    youtube: "https://www.youtube.com/",
    tiktok: "https://www.tiktok.com/",
  },
};

/** Stored JSON over the defaults; anything invalid falls back to the defaults as a whole. */
export function mergeSettings(stored: unknown): SiteSettings {
  if (!stored || typeof stored !== "object") return defaultSiteSettings;
  const s = stored as Partial<SiteSettings>;
  const candidate = {
    ...defaultSiteSettings,
    ...s,
    address: { ...defaultSiteSettings.address, ...s.address },
    copyright: { ...defaultSiteSettings.copyright, ...s.copyright },
    socials: { ...defaultSiteSettings.socials, ...s.socials },
  };
  const parsed = siteSettingsSchema.safeParse(candidate);
  return parsed.success ? parsed.data : defaultSiteSettings;
}

/** Admin form (field names like `address.az`, `socials.x`) → validated settings. */
export function parseSettingsForm(form: FormData) {
  const get = (k: string) => String(form.get(k) ?? "");
  const group = <K extends string>(prefix: string, keys: readonly K[]) =>
    Object.fromEntries(keys.map((k) => [k, get(`${prefix}.${k}`)])) as Record<K, string>;
  const parsed = siteSettingsSchema.safeParse({
    phone: get("phone"),
    phone2: get("phone2"),
    whatsapp: get("whatsapp"),
    email: get("email"),
    address: group("address", locales),
    copyright: group("copyright", locales),
    socials: group("socials", SOCIALS),
  });
  if (parsed.success) return { ok: true as const, data: parsed.data };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) errors[issue.path.join(".")] ??= issue.message;
  return { ok: false as const, errors };
}

export const whatsappHref = (number: string) => `https://wa.me/${number.replace(/\D/g, "")}`;
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
```

- [ ] **Addım 4: Testi işlət, keçdiyini gör**

Run: `npm run test:unit`
Gözlənilən: PASS (settings 6 test daxil)

- [ ] **Addım 5: Cache teqləri** — marketinq-dən götür (sınanıb, bütün proseslərə ≤3 s-də çatır)

```bash
mkdir -p src/lib/cache
cp ../marketing/src/lib/cache/tags.ts ../marketing/src/lib/cache/tag-sync.ts src/lib/cache/
cp ../marketing/src/instrumentation.ts src/
```

Fayllar dəyişmədən işləyir: `@/db` və `cacheTags` (`tag`, `expiredAt`) adları eynidir. `tags.ts`-in sonuna əlavə et:

```ts
/** Header / footer contacts and socials (admin → Sayt ayarları). */
export const SETTINGS_TAG = "settings";
```

- [ ] **Addım 6: `src/features/settings/queries.ts`**

```ts
import "server-only";
import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { SETTINGS_TAG } from "@/lib/cache/tags";
import { mergeSettings, type SiteSettings } from "./schema";

export const SETTINGS_KEY = "site";

/** Cached until an admin saves the settings (invalidateTags([SETTINGS_TAG])). */
export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheLife("max");
  cacheTag(SETTINGS_TAG);
  const [row] = await db
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, SETTINGS_KEY))
    .limit(1);
  return mergeSettings(row?.value);
}
```

- [ ] **Addım 7: Commit**

```bash
npm run typecheck && npm run test:unit
git add src/lib/cache src/instrumentation.ts src/features/settings tests/unit/settings.test.ts
git commit -m "feat: cache teqləri və sayt ayarları modulu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 8: Admin girişi (sessiya + cəhd limiti)

**Fayllar:**
- Yarat: `src/lib/client-ip.ts`, `src/lib/rate-limit.ts`, `src/lib/auth/session.ts`, `src/lib/auth/index.ts`, `src/app/admin/layout.tsx`, `src/app/admin/actions.ts`, `src/app/admin/login/page.tsx`, `src/app/admin/login/login-form.tsx`, `src/app/admin/(panel)/layout.tsx`, `src/app/admin/(panel)/page.tsx`, `scripts/seed/admin.mts`, `playwright.config.ts`, `tests/e2e/global-setup.ts`, `tests/e2e/db.ts`, `tests/e2e/admin-auth.spec.ts`

**İnterfeyslər:**
- İstifadə edir: `db`, `users`, `sessions`, `rateLimits`
- Verir:
  - `createSession(userId: string): Promise<void>`, `deleteSession(): Promise<void>`, `getSessionUser(): Promise<SessionUser | null>`, `requireAdmin(): Promise<SessionUser>`; `SessionUser = { id: string; role: "admin" | "factory"; name: string; email: string | null; username: string | null; mustChangePassword: boolean }`
  - `isRateLimited(key: string, limit: number, windowSec: number): Promise<boolean>`, `recordAttempt(key: string, windowSec: number): Promise<void>`, `clearAttempts(key: string): Promise<void>`
  - `clientIpHash(): Promise<string>`
  - E2E köməkçiləri: `resetRateLimits(): Promise<void>`, `loginAsAdmin(page: Page): Promise<void>`

- [ ] **Addım 1: Uğursuz E2E test yaz** — `tests/e2e/admin-auth.spec.ts`

```ts
import { expect, test } from "@playwright/test";
import { loginAsAdmin, resetRateLimits } from "./db";

const email = process.env.ADMIN_EMAIL!;

test.afterEach(resetRateLimits);

test("signed-out visitor is sent to the login page", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("wrong password shows an error", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Şifrə").fill("yanlis-sifre-123");
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await expect(page.getByText("E-mail və ya şifrə yanlışdır")).toBeVisible();
});

test("five failed attempts lock the login for 15 minutes", async ({ page }) => {
  await page.goto("/admin/login");
  for (let i = 0; i < 5; i++) {
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Şifrə").fill(`yanlis-${i}`);
    await page.getByRole("button", { name: "Daxil ol" }).click();
    await expect(page.getByText("E-mail və ya şifrə yanlışdır")).toBeVisible();
  }
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Şifrə").fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await expect(page.getByText("Çox cəhd edildi. 15 dəqiqə sonra yenidən yoxlayın.")).toBeVisible();
});

test("admin signs in and out", async ({ page }) => {
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByRole("button", { name: "Çıxış" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});
```

- [ ] **Addım 2: Playwright konfiqurasiyası və köməkçilər**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch {}

// Run against a production build: `npm run build` first; the server starts automatically.
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  // Tests change shared database rows, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100" },
  webServer: {
    command: "npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    env: { SITE_NOINDEX: "1" },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

`tests/e2e/db.ts`:

```ts
import { expect, type Page } from "@playwright/test";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

/** Local database only — refuses anything that is not localhost. */
function assertLocal() {
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("E2E helpers only run against a local database");
  }
}

export async function resetRateLimits() {
  assertLocal();
  await sql`delete from rate_limits`;
}

export async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel("Şifrə").fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
```

`tests/e2e/global-setup.ts`:

```ts
import { execFileSync } from "node:child_process";
import postgres from "postgres";

/** Every run starts from a known state: migrated schema, the admin from .env.local, no limits, default settings. */
export default async function globalSetup() {
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("E2E tests only run against a local database");
  }
  execFileSync("npm", ["run", "db:migrate"], { stdio: "inherit", shell: true });
  execFileSync("npm", ["run", "db:seed-admin"], { stdio: "inherit", shell: true });
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  await sql`delete from rate_limits`;
  await sql`delete from sessions`;
  await sql.end();
}
```

- [ ] **Addım 3: Testi işlət, uğursuz olduğunu gör**

```bash
npm run build && npm run test:e2e -- admin-auth
```

Gözlənilən: FAIL — `npm run db:seed-admin` skripti tapılmır / `/admin` 404.

- [ ] **Addım 4: `scripts/seed/admin.mts`**

```ts
// Creates (or resets the password of) the admin from ADMIN_EMAIL / ADMIN_PASSWORD.
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "../../src/db/schema";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 12) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (min 12 chars) in .env.local");
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);
const passwordHash = await bcrypt.hash(password, 12);

await db
  .insert(users)
  .values({ role: "admin", email, name: "Admin", passwordHash })
  .onConflictDoUpdate({ target: users.email, set: { passwordHash, role: "admin", status: "active" } });

console.log(`Admin ready: ${email}`);
await client.end();
```

- [ ] **Addım 5: `src/lib/client-ip.ts`**

```ts
import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

/**
 * Visitor IP, hashed (never stored raw). On cPanel / LiteSpeed only the last X-Forwarded-For
 * entry is added by our server (CLIENT_IP_FROM=last-forwarded); earlier entries can be forged.
 */
export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const forwarded = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ip =
    (process.env.CLIENT_IP_FROM === "last-forwarded" ? forwarded.at(-1) : forwarded[0]) ?? h.get("x-real-ip") ?? "unknown";
  return createHash("sha256").update(`${process.env.IP_HASH_SALT ?? ""}:${ip}`).digest("hex").slice(0, 32);
}
```

- [ ] **Addım 6: `src/lib/rate-limit.ts`**

```ts
import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";

/** True when `key` already has `limit` attempts inside the current window. */
export async function isRateLimited(key: string, limit: number, windowSec: number): Promise<boolean> {
  const [row] = await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1);
  if (!row) return false;
  if (Date.now() - row.windowStart.getTime() > windowSec * 1000) return false;
  return row.count >= limit;
}

/** Counts one attempt; a new window starts when the previous one has passed. */
export async function recordAttempt(key: string, windowSec: number): Promise<void> {
  const expired = sql`${rateLimits.windowStart} < now() - make_interval(secs => ${windowSec})`;
  await db
    .insert(rateLimits)
    .values({ key, windowStart: new Date(), count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${expired} then now() else ${rateLimits.windowStart} end`,
      },
    });
}

export async function clearAttempts(key: string): Promise<void> {
  await db.delete(rateLimits).where(eq(rateLimits.key, key));
}
```

- [ ] **Addım 7: `src/lib/auth/session.ts` və `src/lib/auth/index.ts`**

`session.ts`:

```ts
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

const COOKIE = "zv_session";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + MAX_AGE_MS);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  store.delete(COOKIE);
}

export type SessionUser = {
  id: string;
  role: "admin" | "factory";
  name: string;
  email: string | null;
  username: string | null;
  mustChangePassword: boolean;
};

/** Signed-in active user or null. Reads the request cookie, so callers sit behind Suspense. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({
      id: users.id,
      role: users.role,
      name: users.name,
      email: users.email,
      username: users.username,
      mustChangePassword: users.mustChangePassword,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date()), eq(users.status, "active")))
    .limit(1);
  return row ?? null;
}
```

`index.ts`:

```ts
import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./session";

/** Every admin page and admin server action calls this first. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/admin/login");
  return user;
}

export { createSession, deleteSession, getSessionUser, type SessionUser } from "./session";
```

- [ ] **Addım 8: Admin səhifələri**

`src/app/admin/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { inter } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = { title: "Admin — Zavod.az", robots: { index: false, follow: false } };

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="az" className={inter.variable}>
      <body className="min-h-dvh bg-gray-50 text-body-sm text-brand-950">{children}</body>
    </html>
  );
}
```

`src/app/admin/actions.ts`:

```ts
"use server";

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, deleteSession } from "@/lib/auth";
import { clientIpHash } from "@/lib/client-ip";
import { clearAttempts, isRateLimited, recordAttempt } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
});
const WINDOW_SEC = 15 * 60;
const MAX_FAILURES = 5;

// Compared against when the email is unknown, so both paths take the same time.
let dummyHash: string | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync("not-a-real-password", 12));

export type LoginState = { error?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const key = `admin-login:${await clientIpHash()}`;
  if (await isRateLimited(key, MAX_FAILURES, WINDOW_SEC)) {
    return { error: "Çox cəhd edildi. 15 dəqiqə sonra yenidən yoxlayın." };
  }

  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  const [user] = parsed.success
    ? await db
        .select()
        .from(users)
        .where(and(eq(users.email, parsed.data.email), eq(users.role, "admin"), eq(users.status, "active")))
        .limit(1)
    : [];
  const ok = await bcrypt.compare(parsed.success ? parsed.data.password : "", user?.passwordHash ?? getDummyHash());
  if (!user || !ok) {
    await recordAttempt(key, WINDOW_SEC);
    return { error: "E-mail və ya şifrə yanlışdır" };
  }

  await clearAttempts(key);
  await createSession(user.id);
  redirect("/admin");
}

export async function logout() {
  await deleteSession();
  redirect("/admin/login");
}
```

`src/app/admin/login/login-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { login } from "../actions";

const input =
  "h-11 w-full rounded-[4px] border border-gray-200 px-3 text-body-md text-brand-950 placeholder:text-gray-400 focus:border-brand-700 focus:outline-none";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 text-body-sm text-brand-950">
        E-mail
        <input name="email" type="email" autoComplete="username" required className={input} />
      </label>
      <label className="flex flex-col gap-2 text-body-sm text-brand-950">
        Şifrə
        <input name="password" type="password" autoComplete="current-password" required className={input} />
      </label>
      {state?.error && (
        <p role="alert" className="text-body-sm text-red-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-[4px] bg-brand-950 px-4 text-body-md text-white disabled:opacity-60"
      >
        Daxil ol
      </button>
    </form>
  );
}
```

`src/app/admin/login/page.tsx`:

```tsx
import { Logo } from "@/components/ui/logo";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4">
      <Logo variant="header" />
      <div className="w-full max-w-md rounded-[10px] bg-white p-10">
        <h1 className="mb-6 text-h5">Admin panelə giriş</h1>
        <LoginForm />
      </div>
    </main>
  );
}
```

`src/app/admin/(panel)/layout.tsx`:

```tsx
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";

const MENU = [
  { label: "Dashboard", href: "/admin" },
  { label: "Sayt ayarları", href: "/admin/settings" },
];

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<div className="p-8">Yüklənir…</div>}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

/** Reads the session cookie at request time; redirects to login when signed out. */
async function Gate({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-60 shrink-0 flex-col gap-1 bg-brand-950 p-4 text-white">
        <p className="mb-4 text-subtitle-2s-semibold">Zavod.az admin</p>
        <nav className="flex flex-col gap-1">
          {MENU.map((m) => (
            <Link key={m.href} href={m.href} className="rounded-[4px] px-3 py-2 hover:bg-brand-900">
              {m.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="mt-auto">
          <p className="mb-2 truncate text-caption text-gray-300">{user.email}</p>
          <button type="submit" className="w-full rounded-[4px] px-3 py-2 text-left hover:bg-brand-900">
            Çıxış
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

`src/app/admin/(panel)/page.tsx`:

```tsx
import Link from "next/link";

export default function DashboardPage() {
  return (
    <>
      <h1 className="mb-6 text-h4">Dashboard</h1>
      <p className="text-body-md">
        Hazırda yalnız <Link href="/admin/settings" className="underline">sayt ayarları</Link> mövcuddur. Digər bölmələr
        növbəti addımlarda əlavə olunacaq.
      </p>
    </>
  );
}
```

- [ ] **Addım 9: Testi işlət, keçdiyini gör**

```bash
npm run build && npm run test:e2e -- admin-auth
```

Gözlənilən: PASS (4 test)

- [ ] **Addım 10: Commit**

```bash
git add src/lib src/app/admin scripts/seed playwright.config.ts tests/e2e
git commit -m "feat: admin girişi, sessiya və cəhd limiti

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 9: Vizual test infrastrukturu (Figma ilə piksel müqayisəsi)

Header/Footer-dən **əvvəl** qurulur ki, onlar yazılarkən dərhal ölçülsün.

**Fayllar:**
- Yarat: `tests/visual/targets.json`, `scripts/figma/export-references.mts`, `tests/visual/capture.mjs`, `tests/visual/compare.mjs`, `src/components/dev/figma-overlay.tsx`, `src/app/api/dev/figma/[bp]/[name]/route.ts`, `design/reference/**.png` (export)

**İnterfeyslər:**
- Verir:
  - `targets.json`: `[{ name, bp: "desktop" | "mobile", node, path, selector, open? }]`
  - Elementlərdə `data-figma="<name>"` atributu — müqayisə olunan hər hissə bu atributu daşımalıdır
  - `npm run visual:capture && npm run visual:compare` → fərq > 0.5% olanda exit code 1
  - Development-də `?overlay=<name>` — Figma PNG-si elementin üstünə 50% şəffaflıqla qoyulur (`o` düyməsi ilə gizlət/göstər)

- [ ] **Addım 1: `tests/visual/targets.json`**

```json
[
  { "name": "header", "bp": "desktop", "node": "143:1693", "path": "/", "selector": "[data-figma=header]" },
  { "name": "header", "bp": "mobile", "node": "685:20711", "path": "/", "selector": "[data-figma=header]" },
  { "name": "footer", "bp": "desktop", "node": "143:2121", "path": "/", "selector": "[data-figma=footer]" },
  { "name": "footer", "bp": "mobile", "node": "685:21139", "path": "/", "selector": "[data-figma=footer]" },
  {
    "name": "mobile-menu",
    "bp": "mobile",
    "node": "682:20679",
    "path": "/",
    "selector": "[data-figma=mobile-menu]",
    "open": "[data-figma=header] button[aria-haspopup=dialog]"
  }
]
```

- [ ] **Addım 2: `scripts/figma/export-references.mts`**

```ts
// Exports every target in tests/visual/targets.json from Figma at 1x → design/reference/<bp>/<name>.png
import { readFile } from "node:fs/promises";
import { download, exportImages } from "./api.mts";

type Target = { name: string; bp: string; node: string };
const targets = JSON.parse(await readFile("tests/visual/targets.json", "utf8")) as Target[];
const urls = await exportImages([...new Set(targets.map((t) => t.node))], { format: "png", scale: 1 });
for (const t of targets) {
  await download(urls[t.node], `design/reference/${t.bp}/${t.name}.png`);
  console.log(`design/reference/${t.bp}/${t.name}.png`);
}
```

- [ ] **Addım 3: `tests/visual/capture.mjs`**

```js
// Screenshots every target element at the Figma frame widths (desktop 1440, mobile 320).
// Usage: npm run visual:capture   (production server on E2E_BASE_URL, default http://localhost:3100)
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 320, height: 568 } };
const targets = JSON.parse(await readFile("tests/visual/targets.json", "utf8"));

const browser = await chromium.launch();
for (const t of targets) {
  const page = await browser.newPage({ viewport: VIEWPORTS[t.bp], deviceScaleFactor: 1 });
  await page.goto(base + t.path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (t.open) await page.click(t.open);
  const el = page.locator(t.selector).first();
  await el.waitFor({ state: "visible" });
  await mkdir(`test-results/visual/${t.bp}`, { recursive: true });
  await el.screenshot({ path: `test-results/visual/${t.bp}/${t.name}.png`, animations: "disabled", caret: "hide" });
  console.log(`${t.bp}/${t.name}`);
  await page.close();
}
await browser.close();
```

- [ ] **Addım 4: `tests/visual/compare.mjs`**

```js
// Compares site screenshots with Figma exports. Fails (exit 1) when a size differs or more
// than 0.5% of the pixels differ. Red diff images: test-results/visual/diff/<bp>-<name>.png
import { mkdir, readFile, writeFile } from "node:fs/promises";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const MAX_DIFF_PERCENT = 0.5;
const targets = JSON.parse(await readFile("tests/visual/targets.json", "utf8"));
const rows = [];
let failed = false;

for (const t of targets) {
  const figma = PNG.sync.read(await readFile(`design/reference/${t.bp}/${t.name}.png`));
  const site = PNG.sync.read(await readFile(`test-results/visual/${t.bp}/${t.name}.png`));
  const row = { target: `${t.bp}/${t.name}`, figma: `${figma.width}x${figma.height}`, site: `${site.width}x${site.height}` };
  if (figma.width !== site.width || figma.height !== site.height) {
    rows.push({ ...row, diff: "SIZE", ok: false });
    failed = true;
    continue;
  }
  const diff = new PNG({ width: figma.width, height: figma.height });
  // includeAA: false — anti-aliased text edges (Figma vs Chrome rasteriser) are not counted.
  const n = pixelmatch(figma.data, site.data, diff.data, figma.width, figma.height, { threshold: 0.1, includeAA: false });
  const percent = +((n / (figma.width * figma.height)) * 100).toFixed(2);
  await mkdir("test-results/visual/diff", { recursive: true });
  await writeFile(`test-results/visual/diff/${t.bp}-${t.name}.png`, PNG.sync.write(diff));
  const ok = percent <= MAX_DIFF_PERCENT;
  if (!ok) failed = true;
  rows.push({ ...row, diff: `${percent}%`, ok });
}

console.table(rows);
process.exit(failed ? 1 : 0);
```

- [ ] **Addım 5: Development overlay**

`src/app/api/dev/figma/[bp]/[name]/route.ts`:

```ts
import { readFile } from "node:fs/promises";

/** Figma reference images for the overlay — development only. */
export async function GET(_req: Request, { params }: RouteContext<"/api/dev/figma/[bp]/[name]">) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  const { bp, name } = await params;
  if (!/^(desktop|mobile)$/.test(bp) || !/^[a-z0-9-]+$/.test(name)) return new Response(null, { status: 400 });
  try {
    const png = await readFile(`design/reference/${bp}/${name}.png`);
    return new Response(png, { headers: { "content-type": "image/png", "cache-control": "no-store" } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
```

`src/components/dev/figma-overlay.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

type Box = { top: number; left: number; src: string };

/** `?overlay=header` puts the Figma export over [data-figma=header] at 50% opacity. Key "o" toggles it. */
export function FigmaOverlay() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const name = new URLSearchParams(location.search).get("overlay");
    if (!name) return;
    const bp = innerWidth >= 1024 ? "desktop" : "mobile";
    const place = () =>
      setBoxes(
        [...document.querySelectorAll<HTMLElement>(`[data-figma="${name}"]`)].map((el) => {
          const r = el.getBoundingClientRect();
          return { top: r.top + scrollY, left: r.left + scrollX, src: `/api/dev/figma/${bp}/${name}` };
        }),
      );
    place();
    const onKey = (e: KeyboardEvent) => e.key === "o" && setVisible((v) => !v);
    addEventListener("resize", place);
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("resize", place);
      removeEventListener("keydown", onKey);
    };
  }, []);

  if (!visible) return null;
  return boxes.map((b, i) => (
    // eslint-disable-next-line @next/next/no-img-element -- dev-only overlay
    <img
      key={i}
      src={b.src}
      alt=""
      style={{ position: "absolute", top: b.top, left: b.left, opacity: 0.5, pointerEvents: "none", zIndex: 9999 }}
    />
  ));
}
```

- [ ] **Addım 6: Referansları export et**

```bash
npm run figma:references
```

Gözlənilən: `design/reference/desktop/header.png` (1440×129), `desktop/footer.png` (1440×371), `mobile/header.png` (320×62), `mobile/footer.png` (320×607), `mobile/mobile-menu.png` (320×568).

- [ ] **Addım 7: Commit**

```bash
git add tests/visual scripts/figma/export-references.mts src/components/dev src/app/api design/reference
git commit -m "test: Figma ilə piksel müqayisəsi və dev overlay

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 10: Header, mobil menyu, dil seçici, Footer

**Fayllar:**
- Yarat: `src/components/ui/whatsapp-link.tsx`, `src/components/layout/header.tsx`, `src/components/layout/lang-switcher.tsx`, `src/components/layout/mobile-menu.tsx`, `src/components/layout/footer.tsx`, `tests/e2e/layout.spec.ts`
- Dəyiş: `src/app/[lang]/layout.tsx`, `src/app/[lang]/page.tsx`

**İnterfeyslər:**
- İstifadə edir: `getSiteSettings`, `whatsappHref`, `telHref` (T7), `dict`, `href`, `switchLocalePath` (T5), `Icon`, `SocialIcon`, `Logo` (T3), `FigmaOverlay` (T9)
- Verir: `<Header lang />`, `<Footer lang />` — `[lang]/layout.tsx` hər səhifədə göstərir

Figma ölçüləri (Tapşırıq 2-dəki `figma:inspect` ilə yoxlanılıb):

| Element | Desktop (1440) | Mobil (320) |
|---|---|---|
| Header | 129 hündürlük (alt xətt 1px `gray-200` daxil), padding 20/60, loqo 167×87 aşağı düzlənmiş; sağ blok sütun gap 25: üst sıra 40px gap 20, menyu sırası gap 40 `subtitle-3-medium` | 62 hündürlük, padding 16/16/0/16, loqo 88×46; 2 düymə 40×40 gap 10 (giriş `brand-950`, menyu `brand-50`), alt xətt yoxdur |
| Telefon | ikon 20 + gap 6 + `body-md` | — (menyuda) |
| WhatsApp | 240×40, `whatsapp-bg`, 1px `whatsapp-border`, r4, ikon 20 + gap 6 + `body-md whatsapp-text` | menyuda 288×40, padding x24 |
| Dil düyməsi | 66×40, 1px `gray-200`, r4, padding x10, "Az" + ox 20, gap 6 | menyuda seqment: 288×52, `gray-50`, r-full, p4; element 93×44 r-full, aktiv `white`/`brand-950`, passiv `gray-500`, `subtitle-3` |
| Daxil ol | 112×40, `brand-950`, r4, padding x16, ikon 20 + gap 6 + `body-md white` | ikon düyməsi |
| Mobil menyu | — | tam ekran ağ, padding 20/16, gap 26: bağla düyməsi (sağda), linklər gap 24 `subtitle-2-medium`, dil seqmenti, xətt `gray-200`, telefon, WhatsApp (gap 14) |
| Footer | `brand-950`, padding 40/0/24, bloklar arası 37; loqo 206×113; 3 link sütunu gap 60, sütunda gap 24, `subtitle-3 white`; xətt 1px `gray-700`; aşağı blok padding x60 gap 25; sosial 40×40 gap 10; Ünvan/Telefon `subtitle-2s-semibold`, gap 18, mətn `body-md-flat`; hüquqi linklər `body-sm gray-100` 1px ağ ayırıcı (12px) gap 13; © `body-sm gray-500` | padding 32/0/24, gap 24; loqo 113×61; linklər 2 sütun (144px) gap 16 `mob-subtitle-2`; sosial `justify-between`; Ünvan/Telefon gap 10, bloklar arası 24; hüquqi linklər `caption-tight`, ayırıcı 9px; © `body-sm` |

- [ ] **Addım 1: Uğursuz E2E test yaz** — `tests/e2e/layout.spec.ts`

```ts
import { expect, test } from "@playwright/test";

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("header has the main menu and contacts", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Əsas menyu" });
    for (const label of ["Ana səhifə", "Xəbərlər", "Kataloq", "Tariflər", "Vakansiyalar", "Əlaqə"]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "+994 000 00 00" }).first()).toHaveAttribute("href", "tel:+9940000000");
    await expect(page.getByRole("link", { name: "Birbaşa Whatsapp-a yazın" }).first()).toHaveAttribute(
      "href",
      "https://wa.me/994000000000",
    );
  });

  test("language switcher keeps the page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Dil: Az" }).click();
    await page.getByRole("link", { name: "En" }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("navigation", { name: "Main menu" }).getByRole("link", { name: "Catalog" })).toBeVisible();
  });

  test("footer shows contacts, socials and legal links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer.getByText("Lorem ipsum street 00, AZ 000")).toBeVisible();
    await expect(footer.getByRole("link", { name: "İstifadəçi qaydaları" })).toHaveAttribute("href", "/istifadeci-qaydalari");
    await expect(footer.getByRole("link", { name: "Facebook" })).toBeVisible();
    await expect(footer.getByText("©Bütün hüquqlar qorunur. Zavod.az, 2025")).toBeVisible();
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test("menu opens, closes with Escape, and has no horizontal scroll", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menyunu aç" }).click();
    const menu = page.getByRole("dialog");
    await expect(menu.getByRole("link", { name: "Vakansiyalar" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBe(0);
  });

  test("menu switches language", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menyunu aç" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Ru" }).click();
    await expect(page).toHaveURL(/\/ru$/);
  });
});
```

- [ ] **Addım 2: Testi işlət, uğursuz olduğunu gör**

```bash
npm run build && npm run test:e2e -- layout
```

Gözlənilən: FAIL — "Əsas menyu" naviqasiyası tapılmır.

- [ ] **Addım 3: `src/components/ui/whatsapp-link.tsx`**

```tsx
import { whatsappHref } from "@/features/settings/schema";
import { Icon } from "./icon";

/** Figma "Birbaşa Whatsapp-a yazın" pill: 40px high, green tint, 4px radius. */
export function WhatsAppLink({ number, label, className = "" }: { number: string; label: string; className?: string }) {
  return (
    <a
      href={whatsappHref(number)}
      target="_blank"
      rel="noopener"
      className={`flex h-10 items-center justify-center gap-1.5 rounded-[4px] border border-whatsapp-border bg-whatsapp-bg text-body-md text-whatsapp-text ${className}`}
    >
      <Icon name="whatsapp" size={20} />
      {label}
    </a>
  );
}
```

- [ ] **Addım 4: `src/components/layout/lang-switcher.tsx`** (desktop; açıq hal Figma-da yoxdur — S3)

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { locales, type Locale } from "@/i18n/config";
import { switchLocalePath } from "@/i18n/routes";
import { Icon } from "@/components/ui/icon";

type Props = { lang: Locale; labels: Record<Locale, string>; languageLabel: string };

export function LangSwitcher({ lang, labels, languageLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [hrefs, setHrefs] = useState<Record<Locale, string> | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("mousedown", close);
    addEventListener("keydown", esc);
    return () => {
      removeEventListener("mousedown", close);
      removeEventListener("keydown", esc);
    };
  }, [open]);

  const toggle = () => {
    // The public URL is only known in the browser (the proxy rewrites it internally).
    setHrefs(Object.fromEntries(locales.map((l) => [l, switchLocalePath(location.pathname, l)])) as Record<Locale, string>);
    setOpen((v) => !v);
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={`${languageLabel}: ${labels[lang]}`}
        className="flex h-10 w-[66px] items-center justify-center gap-1.5 rounded-[4px] border border-gray-200 px-2.5 text-body-md text-brand-950"
      >
        {labels[lang]}
        <Icon name="caret-down" size={20} />
      </button>
      {open && hrefs && (
        <ul className="absolute top-full right-0 z-20 mt-1 w-[66px] overflow-hidden rounded-[4px] border border-gray-200 bg-white">
          {locales.map((l) => (
            <li key={l}>
              <a
                href={hrefs[l]}
                hrefLang={l}
                aria-current={l === lang ? "true" : undefined}
                className="block px-2.5 py-2 text-center text-body-md text-brand-950 hover:bg-gray-50 aria-[current]:bg-gray-50"
              >
                {labels[l]}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Addım 5: `src/components/layout/mobile-menu.tsx`** (Figma `682:20679`)

```tsx
"use client";

import { useRef, useState } from "react";
import { locales, type Locale } from "@/i18n/config";
import { switchLocalePath } from "@/i18n/routes";
import { Icon } from "@/components/ui/icon";
import { WhatsAppLink } from "@/components/ui/whatsapp-link";
import { telHref } from "@/features/settings/schema";

type Props = {
  lang: Locale;
  links: { href: string; label: string }[];
  languageLabels: Record<Locale, string>;
  labels: { open: string; close: string; whatsapp: string; language: string };
  phone: string;
  whatsapp: string;
};

/** Native <dialog>: focus trap, Escape and background inertness come from the browser. */
export function MobileMenu({ lang, links, languageLabels, labels, phone, whatsapp }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [hrefs, setHrefs] = useState<Record<Locale, string> | null>(null);

  const open = () => {
    setHrefs(Object.fromEntries(locales.map((l) => [l, switchLocalePath(location.pathname, l)])) as Record<Locale, string>);
    dialog.current?.showModal();
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-label={labels.open}
        className="flex size-10 items-center justify-center rounded-[4px] bg-brand-50"
      >
        <Icon name="list" size={20} />
      </button>
      <dialog
        ref={dialog}
        data-figma="mobile-menu"
        className="m-0 h-dvh max-h-none w-full max-w-none bg-white p-0 backdrop:bg-transparent"
      >
        <div className="flex flex-col gap-[26px] px-4 py-5">
          <div className="flex flex-col items-end gap-4">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label={labels.close}
              className="flex size-10 items-center justify-center rounded-[4px] bg-brand-50"
            >
              <Icon name="close" size={20} />
            </button>
            <nav className="flex w-full flex-col gap-6">
              {links.map((l) => (
                <a key={l.href} href={l.href} className="text-subtitle-2-medium text-brand-950">
                  {l.label}
                </a>
              ))}
            </nav>
          </div>
          <div role="group" aria-label={labels.language} className="flex h-[52px] items-center rounded-full bg-gray-50 p-1">
            {locales.map((l) => (
              <a
                key={l}
                href={hrefs?.[l] ?? "#"}
                hrefLang={l}
                aria-current={l === lang ? "true" : undefined}
                className="flex h-11 flex-1 items-center justify-center rounded-full px-4 text-subtitle-3 text-gray-500 aria-[current]:bg-white aria-[current]:text-brand-950"
              >
                {languageLabels[l]}
              </a>
            ))}
          </div>
          <hr className="border-gray-200" />
          <div className="flex flex-col gap-3.5">
            <a href={telHref(phone)} className="flex h-6 items-center gap-1.5 text-body-md text-brand-950">
              <Icon name="phone" size={20} />
              {phone}
            </a>
            <WhatsAppLink number={whatsapp} label={labels.whatsapp} className="w-full px-6" />
          </div>
        </div>
      </dialog>
    </>
  );
}
```

- [ ] **Addım 6: `src/components/layout/header.tsx`** (Figma desktop `143:1693`, mobil `685:20711`)

```tsx
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { href, type RouteKey } from "@/i18n/routes";
import { getSiteSettings } from "@/features/settings/queries";
import { telHref } from "@/features/settings/schema";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { WhatsAppLink } from "@/components/ui/whatsapp-link";
import { LangSwitcher } from "./lang-switcher";
import { MobileMenu } from "./mobile-menu";

export const NAV: RouteKey[] = ["home", "news", "catalog", "tariffs", "vacancies", "contact"];

export async function Header({ lang }: { lang: Locale }) {
  const s = await getSiteSettings();
  const t = dict(lang);
  const links = NAV.map((k) => ({ href: href(k, lang), label: t.nav[k as keyof typeof t.nav] }));

  return (
    <header data-figma="header" className="bg-white lg:border-b lg:border-gray-200">
      {/* Desktop ≥ 1024 — 128px + 1px bottom border = Figma 129 */}
      <div className="mx-auto hidden h-[128px] max-w-[1440px] items-end justify-between px-[60px] pt-5 pb-[19px] lg:flex">
        <Link href={href("home", lang)} aria-label="Zavod.az">
          <Logo variant="header" priority />
        </Link>
        <div className="flex flex-col items-end gap-[25px]">
          <div className="flex h-10 items-center gap-5">
            <a href={telHref(s.phone)} className="flex items-center gap-1.5 text-body-md text-brand-950">
              <Icon name="phone" size={20} />
              {s.phone}
            </a>
            <WhatsAppLink number={s.whatsapp} label={t.header.whatsapp} className="w-[240px]" />
            <LangSwitcher lang={lang} labels={t.languages} languageLabel={t.header.language} />
            <Link
              href={href("login", lang)}
              className="flex h-10 items-center gap-1.5 rounded-[4px] bg-brand-950 px-4 text-body-md text-white"
            >
              <Icon name="user-white" size={20} />
              {t.header.login}
            </Link>
          </div>
          <nav aria-label={t.header.mainMenu} className="flex h-6 items-center gap-10">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-subtitle-3-medium text-brand-950">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile < 1024 — Figma 320×62 */}
      <div className="flex h-[62px] items-end justify-between px-4 pt-4 lg:hidden">
        <Link href={href("home", lang)} aria-label="Zavod.az">
          <Logo variant="header-mobile" priority />
        </Link>
        <div className="flex items-center gap-2.5">
          <Link
            href={href("login", lang)}
            aria-label={t.header.login}
            className="flex size-10 items-center justify-center rounded-[4px] bg-brand-950"
          >
            <Icon name="user-white" size={20} />
          </Link>
          <MobileMenu
            lang={lang}
            links={links}
            languageLabels={t.languages}
            labels={{ open: t.header.openMenu, close: t.header.closeMenu, whatsapp: t.header.whatsapp, language: t.header.language }}
            phone={s.phone}
            whatsapp={s.whatsapp}
          />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Addım 7: `src/components/layout/footer.tsx`** (Figma desktop `143:2121`, mobil `685:21139`)

```tsx
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { href } from "@/i18n/routes";
import { getSiteSettings } from "@/features/settings/queries";
import { SOCIALS, telHref } from "@/features/settings/schema";
import { SocialIcon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";

const SOCIAL_LABELS = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", x: "X", youtube: "YouTube", tiktok: "TikTok" };

export async function Footer({ lang }: { lang: Locale }) {
  const s = await getSiteSettings();
  const t = dict(lang);
  // Figma column order. "Xidmətlər" → Tariflər until question S1 is answered.
  const columns = [
    [
      { href: href("home", lang), label: t.nav.home },
      { href: href("news", lang), label: t.nav.news },
    ],
    [
      { href: href("catalog", lang), label: t.nav.catalog },
      { href: href("tariffs", lang), label: t.nav.services },
    ],
    [
      { href: href("vacancies", lang), label: t.nav.vacancies },
      { href: href("contact", lang), label: t.nav.contact },
    ],
  ];
  // Figma mobile footer: left — Ana səhifə, Xəbərlər, Kataloq; right — Xidmətlər, Vakansiyalar, Əlaqə.
  const mobileColumns = [
    [columns[0][0], columns[0][1], columns[1][0]],
    [columns[1][1], columns[2][0], columns[2][1]],
  ];
  const legal = [
    { href: href("terms", lang), label: t.footer.terms },
    { href: href("help", lang), label: t.footer.help },
    { href: href("privacy", lang), label: t.footer.privacy },
  ];
  const socials = SOCIALS.filter((k) => s.socials[k]);

  return (
    <footer data-figma="footer" className="bg-brand-950 pt-8 pb-6 text-white lg:pt-10">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 lg:gap-[37px]">
        {/* Logo + links */}
        <div className="flex flex-col gap-8 px-4 lg:flex-row lg:items-start lg:justify-between lg:px-[60px]">
          <Link href={href("home", lang)} aria-label="Zavod.az">
            <span className="lg:hidden"><Logo variant="footer-mobile" /></span>
            <span className="hidden lg:block"><Logo variant="footer" /></span>
          </Link>
          {/* Mobile: 2 columns × 3 links; desktop: 3 columns × 2 links, vertically centred on the logo */}
          <nav className="grid grid-cols-2 gap-x-0 gap-y-4 lg:hidden">
            {mobileColumns.map((col, i) => (
              <div key={i} className="flex flex-col gap-4">
                {col.map((l) => (
                  <Link key={l.label} href={l.href} className="text-mob-subtitle-2">
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <nav className="hidden h-[113px] items-center gap-[60px] lg:flex">
            {columns.map((col, i) => (
              <div key={i} className="flex flex-col gap-6">
                {col.map((l) => (
                  <Link key={l.label} href={l.href} className="text-subtitle-3">
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <hr className="border-gray-700" />

        <div className="flex flex-col gap-6 px-4 lg:gap-[25px] lg:px-[60px]">
          <div className="flex flex-col gap-8 lg:h-[74px] lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2.5">
              <p className="text-body-md">{t.footer.follow}</p>
              <div className="flex items-center justify-between lg:justify-start lg:gap-2.5">
                {socials.map((k) => (
                  <a key={k} href={s.socials[k]} target="_blank" rel="noopener" aria-label={SOCIAL_LABELS[k]}>
                    <SocialIcon name={k} />
                  </a>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-[60px]">
              <div className="flex flex-col gap-2.5 lg:w-[254px] lg:gap-[18px]">
                <p className="text-subtitle-2s-semibold">{t.footer.address}</p>
                <p className="text-body-md-flat">{s.address[lang]}</p>
              </div>
              <div className="flex flex-col gap-2.5 lg:gap-[18px]">
                <p className="text-subtitle-2s-semibold">{t.footer.phone}</p>
                <p className="flex items-center gap-2.5 text-body-md-flat">
                  <a href={telHref(s.phone)}>{s.phone}</a>
                  {s.phone2 && (
                    <>
                      <span aria-hidden>/</span>
                      <a href={telHref(s.phone2)}>{s.phone2}</a>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <ul className="flex items-center justify-between gap-4 lg:justify-start lg:gap-[13px]">
              {legal.map((l, i) => (
                <li key={l.label} className="flex items-center gap-4 lg:gap-[13px]">
                  {i > 0 && <span aria-hidden className="h-[9px] w-px bg-white lg:h-3" />}
                  <Link href={l.href} className="text-caption-tight text-gray-100 lg:text-body-sm">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-body-sm text-gray-500">{s.copyright[lang]}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Addım 8: Layout-a qoş** — `src/app/[lang]/layout.tsx`

```tsx
import { notFound } from "next/navigation";
import { hasLocale, locales } from "@/i18n/config";
import { inter } from "@/lib/fonts";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FigmaOverlay } from "@/components/dev/figma-overlay";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function SiteLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <html lang={lang} className={inter.variable}>
      <body className="flex min-h-dvh flex-col">
        <Header lang={lang} />
        <div className="flex-1">{children}</div>
        <Footer lang={lang} />
        {process.env.NODE_ENV === "development" && <FigmaOverlay />}
      </body>
    </html>
  );
}
```

`src/app/[lang]/page.tsx` (ana səhifə addım 4-də yazılacaq; hələlik boş məzmun):

```tsx
export default function HomePage() {
  return <main className="container-site min-h-[400px]" />;
}
```

- [ ] **Addım 9: E2E testi işlət**

```bash
npm run build && npm run test:e2e -- layout
```

Gözlənilən: PASS (5 test)

- [ ] **Addım 10: Piksel müqayisəsi**

```bash
npx next start -p 3100 &
npm run visual:capture && npm run visual:compare
```

Gözlənilən: 5 hədəfin hamısında ölçü eyni, `diff ≤ 0.5%`, exit 0. Fərq çıxanda: `test-results/visual/diff/<bp>-<name>.png`-də qırmızı yerlərə bax, `npm run dev` ilə `http://localhost:3000/?overlay=header` aç və sürüşməni düzəlt. Ölçü fərqi (SIZE) olarsa — əvvəlcə hündürlüyü düzəlt. Test keçməyincə tapşırıq bitmiş sayılmır.

- [ ] **Addım 11: Commit**

```bash
git add src/components src/app/[lang] tests/e2e/layout.spec.ts
git commit -m "feat: Header, mobil menyu, dil seçici və Footer (Figma 1:1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 11: Admin → Sayt ayarları

**Fayllar:**
- Yarat: `src/app/admin/(panel)/settings/page.tsx`, `src/app/admin/(panel)/settings/settings-form.tsx`, `src/app/admin/(panel)/settings/actions.ts`, `tests/e2e/settings.spec.ts`

**İnterfeyslər:**
- İstifadə edir: `requireAdmin` (T8), `parseSettingsForm`, `getSiteSettings`, `SETTINGS_KEY` (T7), `invalidateTags`, `SETTINGS_TAG` (T7)
- Verir: `saveSettings(prev: SaveState, form: FormData): Promise<SaveState>`; `SaveState = { ok?: boolean; errors?: Record<string, string> } | undefined`

- [ ] **Addım 1: Uğursuz E2E test yaz** — `tests/e2e/settings.spec.ts`

```ts
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./db";

test.use({ viewport: { width: 1440, height: 900 } });

test("admin changes the phone and the header shows it at once", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/settings");
  await page.getByLabel("Telefon", { exact: true }).fill("+994 12 555 55 55");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByText("Yadda saxlanıldı")).toBeVisible();

  await page.goto("/");
  await expect(page.locator("header").getByRole("link", { name: "+994 12 555 55 55" })).toBeVisible();

  // Restore the Figma default so the visual test keeps matching.
  await page.goto("/admin/settings");
  await page.getByLabel("Telefon", { exact: true }).fill("+994 000 00 00");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByText("Yadda saxlanıldı")).toBeVisible();
});

test("invalid email is rejected with a message", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/settings");
  await page.getByLabel("E-mail").fill("yanlış");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByText("E-mail düzgün deyil")).toBeVisible();
});
```

- [ ] **Addım 2: Testi işlət, uğursuz olduğunu gör**

```bash
npm run build && npm run test:e2e -- settings
```

Gözlənilən: FAIL — `/admin/settings` 404.

- [ ] **Addım 3: `src/app/admin/(panel)/settings/actions.ts`**

```ts
"use server";

import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { invalidateTags, SETTINGS_TAG } from "@/lib/cache/tags";
import { SETTINGS_KEY } from "@/features/settings/queries";
import { parseSettingsForm } from "@/features/settings/schema";

export type SaveState = { ok?: boolean; errors?: Record<string, string> } | undefined;

export async function saveSettings(_prev: SaveState, form: FormData): Promise<SaveState> {
  await requireAdmin();
  const parsed = parseSettingsForm(form);
  if (!parsed.ok) return { errors: parsed.errors };
  await db
    .insert(siteSettings)
    .values({ key: SETTINGS_KEY, value: parsed.data })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: parsed.data } });
  await invalidateTags([SETTINGS_TAG]);
  return { ok: true };
}
```

- [ ] **Addım 4: `src/app/admin/(panel)/settings/settings-form.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import { locales } from "@/i18n/config";
import { SOCIALS, type SiteSettings } from "@/features/settings/schema";
import { saveSettings } from "./actions";

const input = "h-10 w-full rounded-[4px] border border-gray-200 bg-white px-3 text-body-md focus:border-brand-700 focus:outline-none";
const LANG_LABEL = { az: "AZ", en: "EN", ru: "RU" } as const;

function Field({ label, name, value, error }: { label: string; name: string; value: string; error?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-body-sm">
      {label}
      <input name={name} defaultValue={value} aria-invalid={!!error} className={input} />
      {error && <span className="text-caption text-red-700">{error}</span>}
    </label>
  );
}

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, action, pending] = useActionState(saveSettings, undefined);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="flex max-w-3xl flex-col gap-8">
      <section className="grid grid-cols-2 gap-4 rounded-[10px] bg-white p-6">
        <h2 className="col-span-2 text-subtitle-2s-semibold">Əlaqə</h2>
        <Field label="Telefon" name="phone" value={settings.phone} error={e.phone} />
        <Field label="İkinci telefon (footer)" name="phone2" value={settings.phone2} error={e.phone2} />
        <Field label="WhatsApp nömrəsi" name="whatsapp" value={settings.whatsapp} error={e.whatsapp} />
        <Field label="E-mail" name="email" value={settings.email} error={e.email} />
      </section>
      <section className="grid grid-cols-3 gap-4 rounded-[10px] bg-white p-6">
        <h2 className="col-span-3 text-subtitle-2s-semibold">Ünvan və © mətni</h2>
        {locales.map((l) => (
          <Field key={`a-${l}`} label={`Ünvan (${LANG_LABEL[l]})`} name={`address.${l}`} value={settings.address[l]} error={e[`address.${l}`]} />
        ))}
        {locales.map((l) => (
          <Field key={`c-${l}`} label={`© mətni (${LANG_LABEL[l]})`} name={`copyright.${l}`} value={settings.copyright[l]} error={e[`copyright.${l}`]} />
        ))}
      </section>
      <section className="grid grid-cols-2 gap-4 rounded-[10px] bg-white p-6">
        <h2 className="col-span-2 text-subtitle-2s-semibold">Sosial şəbəkələr (boş qalan footer-də görünmür)</h2>
        {SOCIALS.map((s) => (
          <Field key={s} label={s} name={`socials.${s}`} value={settings.socials[s]} error={e[`socials.${s}`]} />
        ))}
      </section>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="h-10 rounded-[4px] bg-brand-950 px-6 text-body-md text-white disabled:opacity-60">
          Yadda saxla
        </button>
        {state?.ok && <p role="status" className="text-body-sm text-green-600">Yadda saxlanıldı</p>}
        {state?.errors && <p role="alert" className="text-body-sm text-red-700">Xətaları düzəldin</p>}
      </div>
    </form>
  );
}
```

- [ ] **Addım 5: `src/app/admin/(panel)/settings/page.tsx`**

```tsx
import { getSiteSettings } from "@/features/settings/queries";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const settings = await getSiteSettings();
  return (
    <>
      <h1 className="mb-6 text-h4">Sayt ayarları</h1>
      <SettingsForm settings={settings} />
    </>
  );
}
```

- [ ] **Addım 6: Testləri işlət**

```bash
npm run build && npm run test:e2e
```

Gözlənilən: bütün E2E testləri PASS (admin-auth 4, layout 5, settings 2).

- [ ] **Addım 7: Commit**

```bash
git add src/app/admin tests/e2e/settings.spec.ts
git commit -m "feat: admin-dən sayt ayarları (header/footer əlaqə və sosial)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 12: SEO əsasları

**Fayllar:**
- Yarat: `src/lib/seo.ts`, `src/app/robots.ts`, `tests/e2e/routing.spec.ts`
- Dəyiş: `src/app/[lang]/layout.tsx`, `src/app/[lang]/page.tsx`

**İnterfeyslər:**
- İstifadə edir: `alternates`, `href` (T5)
- Verir: `siteUrl`, `siteNoindex`, `siteName`, `pageMetadata({ route, lang, title, description? }): Metadata` — canonical + hreflang (az/en/ru/x-default) + Open Graph

- [ ] **Addım 1: Uğursuz E2E test yaz** — `tests/e2e/routing.spec.ts`

```ts
import { expect, test } from "@playwright/test";

test("home has lang, canonical and hreflang", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en$/);
  await expect(page.locator('link[rel="alternate"][hreflang="az"]')).toHaveAttribute("href", /:\d+\/$|\.az\/$/);
  await expect(page.locator('link[rel="alternate"][hreflang="ru"]')).toHaveAttribute("href", /\/ru$/);
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
  await expect(page).toHaveTitle("Zavod.az — Industrial platform of Azerbaijan");
});

test("/az redirects to / with 308", async ({ request }) => {
  const res = await request.get("/az", { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers()["location"]).toBe("/");
});

test("unknown page answers 404 with the site layout", async ({ page }) => {
  const res = await page.goto("/yoxdur");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Səhifə tapılmadı" })).toBeVisible();
  await expect(page.locator("header")).toBeVisible();
});

test("test copy is closed to search engines", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /");
  const home = await request.get("/");
  expect(home.headers()["x-robots-tag"]).toBe("noindex, nofollow");
});
```

- [ ] **Addım 2: Testi işlət, uğursuz olduğunu gör**

```bash
npm run build && npm run test:e2e -- routing
```

Gözlənilən: FAIL — canonical yoxdur, robots.txt 404.

- [ ] **Addım 3: `src/lib/seo.ts`**

```ts
import type { Metadata } from "next";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { alternates, type RouteKey } from "@/i18n/routes";

export const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
/** Test copy (new.zavod.az): closed to search engines (robots.txt + X-Robots-Tag in next.config). */
export const siteNoindex = process.env.SITE_NOINDEX === "1";
export const siteName = "Zavod.az";

const ogLocale: Record<Locale, string> = { az: "az_AZ", en: "en_US", ru: "ru_RU" };

/** Canonical, hreflang (az / en / ru / x-default) and Open Graph for a page with a fixed URL. */
export function pageMetadata(opts: { route: RouteKey; lang: Locale; title: string; description?: string }): Metadata {
  const urls = alternates(opts.route);
  return {
    title: opts.title,
    description: opts.description,
    alternates: {
      canonical: urls[opts.lang],
      languages: { ...urls, "x-default": urls[defaultLocale] },
    },
    openGraph: {
      type: "website",
      siteName,
      title: opts.title,
      description: opts.description,
      url: urls[opts.lang],
      locale: ogLocale[opts.lang],
      alternateLocale: locales.filter((l) => l !== opts.lang).map((l) => ogLocale[l]),
    },
  };
}
```

- [ ] **Addım 4: `src/app/robots.ts`**

```ts
import type { MetadataRoute } from "next";
import { siteNoindex, siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (siteNoindex) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/kabinet", "/en/cabinet", "/ru/lichnyj-kabinet"] },
    host: siteUrl,
  };
}
```

(Sitemap addım 2-də, ilk dinamik səhifələrlə əlavə olunur.)

- [ ] **Addım 5: Metadata**

`src/app/[lang]/layout.tsx`-ə əlavə et:

```tsx
import type { Metadata } from "next";
import { siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
};
```

`src/app/[lang]/page.tsx`:

```tsx
import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";

const TITLE: Record<Locale, string> = {
  az: "Zavod.az — Azərbaycanın sənaye platforması",
  en: "Zavod.az — Industrial platform of Azerbaijan",
  ru: "Zavod.az — Промышленная платформа Азербайджана",
};

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return pageMetadata({ route: "home", lang, title: TITLE[lang] });
}

export default function HomePage() {
  return <main className="container-site min-h-[400px]" />;
}
```

- [ ] **Addım 6: Testləri işlət**

```bash
npm run build && npm run test:e2e
```

Gözlənilən: bütün E2E testləri PASS (routing 4 daxil).

- [ ] **Addım 7: Commit**

```bash
git add src/lib/seo.ts src/app tests/e2e/routing.spec.ts
git commit -m "feat: SEO əsasları — canonical, hreflang, robots, noindex test mühiti

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 13: cPanel deploy faylları

**Fayllar:**
- Yarat: `deploy/cpanel/{app.js,deploy.sh,rollback.sh,backup.sh,check-server.sh,htaccess.txt,media.htaccess,env.example,package.json,README.md}`

**İnterfeyslər:**
- Verir: serverdə `bash ~/zavod-src/deploy/cpanel/deploy.sh` (build + keçid), `rollback.sh`, `backup.sh` (cron), `check-server.sh` (resurs və Postgres əlavələri yoxlaması)

- [ ] **Addım 1: Marketinq-dən götür və adları dəyiş**

```bash
mkdir -p deploy/cpanel
cp ../marketing/deploy/cpanel/{app.js,deploy.sh,rollback.sh,backup.sh,htaccess.txt,media.htaccess,env.example,package.json} deploy/cpanel/
cd deploy/cpanel
sed -i 's/marketinq-src/zavod-src/g; s/marketinq-app/zavod-app/g; s/marketinq-public/zavod-public/g; s#backups/marketinq#backups/zavod#g; s/marketinq\.az/zavod.az/g; s/marketinq/zavod/g' *
grep -n -i "marketin" * || echo "təmiz"
cd ../..
```

Gözlənilən: "təmiz". Sonra əl ilə yoxla:
- `backup.sh` başlığındakı cron saatı: `45 3 * * *` (marketinq 03:15-dədir, CPU üst-üstə düşməsin).
- `env.example`: `.env.example`-dəki dəyişənlərlə eyni siyahı + `SITE_URL=https://new.zavod.az`, `SITE_NOINDEX=1`, `CLIENT_IP_FROM=last-forwarded`; marketinq-ə aid sətirləri (ffmpeg, Turnstile, SMTP) sil — onlar lazım olan addımda qayıdacaq.
- `deploy.sh`: `npm run --silent db:migrate` və `NEXT_BUILD_CPUS=1 npm run --silent build` sətirləri qalır.

- [ ] **Addım 2: `deploy/cpanel/check-server.sh`**

```bash
#!/usr/bin/env bash
# Checks the cPanel account before the first deploy (cPanel → Terminal):
#   DATABASE_URL='postgres://…' bash ~/zavod-src/deploy/cpanel/check-server.sh
set -uo pipefail

NODE=/opt/alt/alt-nodejs22/root/usr/bin/node
echo "node 22: $($NODE -v 2>/dev/null || echo 'yoxdur')"
echo "disk:"; quota -s 2>/dev/null || du -sh "$HOME" 2>/dev/null
echo "thread-lər: $(ps -u "$(id -u)" -L --no-headers | wc -l) / 150"
echo "Node prosesləri (yaddaş):"
ps -u "$(id -u)" -o rss=,args= | awk '/node/ && !/awk/ {printf "  %5.0f MB  %s\n", $1/1024, substr($0, index($0,$2), 70)}'

if [ -n "${DATABASE_URL:-}" ]; then
  echo "PostgreSQL: $(psql "$DATABASE_URL" -Atc 'show server_version')"
  for ext in pg_trgm unaccent; do
    if psql "$DATABASE_URL" -qc "create extension if not exists $ext" 2>/dev/null; then
      echo "  $ext: OK"
    else
      echo "  $ext: İCAZƏ YOXDUR — axtarış üçün fallback lazımdır (spec 9.7)"
    fi
  done
else
  echo "DATABASE_URL verilməyib — Postgres yoxlanılmadı"
fi
```

- [ ] **Addım 3: `deploy/cpanel/README.md`** — marketinq README-sinin quruluşu ilə, Zavod.az üçün:

```markdown
# cPanel-də yerləşdirmə (hosting.com / A2) — Zavod.az

Zavod.az marketinq.az ilə **eyni cPanel hesabında** işləyir: Setup Node.js App (Node 22) + PostgreSQL.
Hesabdakı digər saytlara (marketinq.az, podcast.az, …) toxunulmur.

## Serverdə qovluqlar
~/zavod-src/      git checkout — yalnız build üçün
~/zavod-app/      Node app root: app.js, current → releases/<id>, releases/, shared/.env, shared/uploads/
~/zavod-public/   saytın document root-u (yalnız .htaccess + media linki)
~/backups/zavod/  gündəlik baza backup-ı

## A. İlk quraşdırma
1. **Resurs yoxlaması:** Terminal → `bash ~/zavod-src/deploy/cpanel/check-server.sh` (3-cü addımdan sonra). Nəticəni developer-ə göndər.
2. **PostgreSQL:** PostgreSQL Database Wizard → baza `zavod`, istifadəçi `zavodapp` (adlar fərqli olmalıdır), ALL PRIVILEGES. Parolu yalnız `shared/.env`-ə yaz.
3. **Kod:** deploy key (yalnız oxuma) ilə private repo-nu klonla:
   ssh-keygen -q -t ed25519 -N "" -f ~/.ssh/zavod_deploy -C "zavod cpanel deploy (read-only)"
   printf 'Host github-zavod\n  HostName github.com\n  User git\n  IdentityFile ~/.ssh/zavod_deploy\n  IdentitiesOnly yes\n' >> ~/.ssh/config
   cat ~/.ssh/zavod_deploy.pub     → GitHub → repo → Settings → Deploy keys (write access YOX)
   git clone github-zavod:<OWNER>/<REPO>.git ~/zavod-src
4. **Qovluqlar və .env:**
   mkdir -p ~/zavod-app/{shared/uploads,releases,tmp} ~/zavod-public ~/backups/zavod
   cp ~/zavod-src/deploy/cpanel/{app.js,package.json} ~/zavod-app/
   cp ~/zavod-src/deploy/cpanel/env.example ~/zavod-app/shared/.env && chmod 600 ~/zavod-app/shared/.env
   .env-i File Manager-də doldur (DATABASE_URL, IP_HASH_SALT, ADMIN_EMAIL, ADMIN_PASSWORD).
5. **İlk build:** `bash ~/zavod-src/deploy/cpanel/deploy.sh`, sonra
   `cd ~/zavod-src && PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH npm run db:seed-admin`
6. **Domen:** Domains → Create A New Domain → `new.zavod.az`, document root `zavod-public` (AutoSSL sertifikatı verir).
7. **Node app:** Setup Node.js App → Create: Node 22.x, Production, root `zavod-app`, URL `new.zavod.az`, startup `app.js`,
   env `NODE_OPTIONS=--max-old-space-size=768 --v8-pool-size=2` → Create → Start. ("Run NPM Install" basma.)
8. **.htaccess:** `~/zavod-public/.htaccess`-in ən yuxarısına `htaccess.txt`-dəki qaydalar (`zavod.az` əvəzinə `new.zavod.az`).
9. **Backup cron:** `45 3 * * * bash $HOME/zavod-src/deploy/cpanel/backup.sh >/dev/null 2>&1`
10. **Yoxla:** https://new.zavod.az — header/footer, dillər, /admin girişi, robots.txt `Disallow: /`.

## B. Yeniləmə
`git push`, sonra serverdə: `bash ~/zavod-src/deploy/cpanel/deploy.sh`. Geri qaytarma: `bash ~/zavod-src/deploy/cpanel/rollback.sh [id]`.
Build 1 CPU-da bir neçə dəqiqə çəkir — yeniləmələri axşam/gecə et.

## Bilmək lazım olanlar
- Yaddaş limiti 768 MB-dır (marketinq 1024): hesabda 4 GB RAM 3+ Node tətbiqi arasında bölünür.
- Thread limiti 150-dir: `deploy.sh` thread hovuzlarını kiçildir; `check-server.sh` cari istifadəni göstərir.
```

- [ ] **Addım 4: Skriptlərin sintaksisini yoxla**

```bash
bash -n deploy/cpanel/deploy.sh deploy/cpanel/rollback.sh deploy/cpanel/backup.sh deploy/cpanel/check-server.sh && echo OK
node --check deploy/cpanel/app.js && echo OK
```

Gözlənilən: OK, OK

- [ ] **Addım 5: Commit**

```bash
git add deploy
git commit -m "chore: cPanel deploy skriptləri (marketinq-dən uyğunlaşdırılıb)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tapşırıq 14: Test domenə ilk deploy

**Ön şərt:** S4 (GitHub repo) və S5 (zavod.az DNS) cavablanıb. Bu tapşırığın addımlarının bir hissəsini **sən cPanel-də** edirsən, şifrələr çatda paylaşılmır.

- [ ] **Addım 1: Tam yoxlama (yerli)**

```bash
npm run typecheck && npm run lint && npm run test:unit
npm run build && npm run test:e2e
npx next start -p 3100 &
npm run visual:capture && npm run visual:compare
```

Gözlənilən: hamısı yaşıl.

- [ ] **Addım 2: GitHub** — private repo yarat (S4), `git remote add origin …`, `git push -u origin main`.

- [ ] **Addım 3: cPanel** — `deploy/cpanel/README.md` A1–A9 addımları. `check-server.sh` nəticəsini developer-ə göndər: `pg_trgm` / `unaccent` icazəsi, disk, thread və yaddaş istifadəsi spec 11-də qeyd olunur.

- [ ] **Addım 4: Canlı yoxlama**

- https://new.zavod.az → 1440 enində Header/Footer Figma ilə eyni; 320 enində mobil menyu açılır
- https://new.zavod.az/en, /ru → dillər işləyir
- https://new.zavod.az/robots.txt → `Disallow: /`; cavab başlığında `X-Robots-Tag: noindex, nofollow`
- https://new.zavod.az/admin → giriş, Sayt ayarları → telefonu dəyiş → sayt header-ində ≤ 3 saniyəyə görünür → geri qaytar
- `E2E_BASE_URL=https://new.zavod.az npm run visual:capture && npm run visual:compare` → yaşıl

- [ ] **Addım 5: Nəticəni qeyd et**

`docs/02-spec.md` bölmə 11-ə `check-server.sh` nəticəsini (Postgres əlavələri, disk, RAM/thread) yaz və commit et:

```bash
git add docs/02-spec.md
git commit -m "docs: hostinq yoxlamasının nəticəsi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Addım 0 bitdi sayılır, əgər:

- [ ] `npm run test:unit`, `npm run test:e2e`, `npm run visual:compare` — hamısı yaşıl
- [ ] Header, Footer, mobil menyu 1440 və 320-də Figma ilə ≤ 0.5% fərqlə eynidir
- [ ] https://new.zavod.az açılır, indekslənmir, admin girişi və sayt ayarları işləyir
- [ ] Hostinq yoxlamasının nəticəsi spec-də qeyd olunub
- [ ] S1–S5 sualları cavablanıb və ya cavab gözləyənlər növbəti addımın planına köçürülüb
