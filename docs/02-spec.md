# Zavod.az — Texniki spec (dizayn sənədi)

> Status: Qaralama v1 · Tarix: 2026-11-11
> Figma inventarı: [01-figma-analiz.md](01-figma-analiz.md). **Dizayn hələ bitməyib** — hər səhifə yazılmazdan əvvəl Figma-dan yenidən oxunur və fərqlər yoxlanılır.
> Əsas tələblər: **çox data olacaq**, sayt **çox sürətli** işləməlidir, **SEO güclü** olmalıdır.

---

## 1. Məqsəd və tələblər

| # | Tələb | Necə həll olunur |
|---|---|---|
| 1 | **UI Figma ilə 1:1, pikselə-piksel eyni** (Desktop 1440, Mobil 320; tablet fluid) | Bölmə 1.1 — dəqiq token-lər, Figma-dan export olunan ikon/loqolar, hər səhifədə avtomatik piksel müqayisəsi |
| 2 | Front və back birlikdə | Tək Next.js layihəsi (bölmə 2) |
| 3 | Çox data (minlərlə zavod, yüz minlərlə məhsul) | Bölmə 6 — indekslər, cache, səhifələmə, aqreqat cədvəllər, yük testi |
| 4 | Sürət | Bölmə 6 — Core Web Vitals hədəfləri, minimal JS, əvvəlcədən hazırlanmış şəkillər |
| 5 | Güclü SEO | Bölmə 7 — SSR HTML, structured data (JobPosting, Organization…), sitemap, hreflang, SEO landing səhifələri |
| 6 | 3 dil (AZ default, EN, RU) | Bölmə 8 |
| 7 | Qeydiyyat admin təsdiqi ilə | Bölmə 9.1 |
| 8 | Ödəniş provayderi hələ seçilməyib | Bölmə 9.5 — provayderdən asılı olmayan modul, əvvəlcə admin əl ilə aktivləşdirir |
| 9 | Deploy marketinq.az ilə eyni cPanel hesabına | Bölmə 11 |

### 1.1 Figma 1:1 — pikselə-piksel

**Qayda:** saytda hər şey Figma ilə eyni olmalıdır: ölçülər, boşluqlar, şrift ölçüsü, sətir hündürlüyü, hərf aralığı, rənglər, radius, kölgələr, ikonlar, hover/active/focus/disabled halları, modallar, boş və xəta halları. Gözlə "təxminən" eyni olmaq qəbul edilmir.

**Necə təmin olunur:**
1. **Dəqiq dəyərlər Figma API-dən götürülür, gözlə ölçülmür.** Hər səhifəyə başlamazdan əvvəl həmin frame-in node-ları API ilə oxunur: `absoluteBoundingBox`, auto-layout `padding` / `itemSpacing`, `style` (fontSize, lineHeightPx, letterSpacing, fontWeight), `fills`, `strokes`, `effects`, `cornerRadius`. Bu dəyərlər koda olduğu kimi köçürülür.
2. **Token-lər:** rənglər (4 şkala), text style-lar (H1–H5, Subtitle, Body, Caption, Overline, Mob/*), radius, kölgə və spacing şkalası `scripts/figma/export-tokens.mts` ilə Figma-dan avtomatik çıxarılır → Tailwind `@theme`. Əl ilə rəng/ölçü yazılmır.
3. **Assetlər Figma-dan export olunur:** loqo, bütün ikonlar (SVG, olduğu kimi), 6 tip ikonu, illüstrasiyalar. Oxşar ikon kitabxanasından "yaxın" ikon götürülmür.
4. **Şrift render-i:** Inter eyni çəkilər (400/500/600) və eyni `font-feature-settings` ilə; Figma-dakı sətir hündürlükləri px kimi köçürülür.
5. **Breakpoint-lər:** 1440 və 320-də Figma ilə tam eyni. Aralıq ölçülərdə (321–1439, o cümlədən tablet) layout axıcıdır, ən yaxın dizayna əsaslanır. 1440-dan böyük ekranlarda məzmun Figma-dakı konteyner enində mərkəzdə qalır.
6. **Avtomatik yoxlama (hər səhifə üçün məcburi), iki pillə** — *2026-11-12-də yeniləndi: Windows-da Chrome mətni Figma-dan fərqli rasterləşdirir (ClearType), ona görə hərf kənarlarına görə 0.5% həddi mətnli hissələrdə əlçatmazdır; ölçü/yerləşmə isə ±1px-ə qədər eynidir.*
   - **a) Həndəsə (əsas, sərt):** səhifənin həmin hissəsinin ölçüsü Figma frame-i ilə **eyni** olmalıdır; Figma-dakı hər görünən mətn node-unun yeri (x, y) və sətir hündürlüyü saytdakı eyni mətnlə müqayisə olunur — fərq **≤ ±1px**. Figma dəyərləri `/nodes` API-dən (və ya yerli nüsxədən) götürülür.
   - **b) Vizual fərq (qoruyucu):** Figma frame-i PNG (`scale=1`) və eyni hissənin Playwright screenshot-u (1440 / 320, Figma-dakı eyni test mətnləri ilə) `pixelmatch` ilə müqayisə olunur — fərq **≤ 2.5%**, diff PNG saxlanılır. Bu, rəng, ikon, boşluq və itən element səhvlərini tutur; şrift rasterləşdirmə fərqini səhv saymır. İstisna (2026-11-16): yalnız sıx mətn (uzun hüquqi mətn, mətn naviqasiyası — Figma ilə Chrome hərfləri fərqli rasterizə edir) və ya qəsdən məzmun fərqi (placeholder, Figma yazı xətası düzəlişi) olan hədəflərə `targets.json`-da `maxDiff` yalnız `maxDiffReason` ilə verilə bilər. Hər `maxDiff` həmin hədəfin ölçülən fərqi + ~0.5 (bir onluq rəqəmə yuvarlaqlaşdırılır), tavan ≤ 7% (`compare.mjs` daha böyük dəyəri rədd edir); həmin hədəflərdə həndəsə yenə ±1px yoxlanılır.
   - Diff şəkli və overlay (bənd 7) əl ilə də nəzərdən keçirilir.
   - Hallar da yoxlanılır: hover, açıq modal, filtr açıq, boş nəticə, xəta mesajı, CV yüklənib, uğurlu müraciət və s. Figma-da çəkilmiş hər hal ayrıca test olunur.
7. **Əl ilə overlay yoxlaması:** brauzerdə Figma PNG-si yarımşəffaf qat kimi səhifənin üstünə qoyulur (dev rejimində `?overlay=1`) — kiçik sürüşmələr gözlə də yoxlanılır.
8. **"Hazırdır" meyarı:** səhifə yalnız həndəsə (6a) və vizual (6b) yoxlamaları keçəndən və overlay-də fərq görünməyəndən sonra hazır sayılır.
9. **Dizayn dəyişəndə:** dizayn hələ bitmədiyi üçün hər addımda Figma yenidən export olunur; vizual test köhnə koda qarşı qırmızı olursa, dəyişiklik dərhal görünür.

**İstisnalar (yalnız bunlar):** real məzmunun uzunluğu fərqli olanda (uzun zavod adı, çox sətirli təsvir) mətn Figma-dakı qaydaya görə sətirdən keçir və ya `…` ilə kəsilir. Hansı yerdə hansı qaydanın işlədiyi Figma-da göstərilməyibsə, soruşulur.

---

## 2. Texnologiyalar

| Hissə | Seçim | Niyə |
|---|---|---|
| Framework | **Next.js 16.4 (App Router, Cache Components)** — React 19 onun daxilindədir | Front + back bir layihədə; marketinq/podcast ilə eyni |
| Dil | TypeScript (strict) | Xətalar işə düşməzdən əvvəl tutulur |
| Stil | Tailwind CSS v4 | CSS çox kiçik olur; Figma token-ləri `@theme`-də |
| Şrift | Inter, `next/font` ilə öz serverimizdən (latin, latin-ext, cyrillic) | Kənar sorğu yoxdur, layout sürüşmür |
| Backend | Server Actions (formalar) + Route Handlers `app/api/*` (callback, fayl, statistika) | Ayrıca Node server lazım deyil → hostinqdə 1 proses |
| Baza | PostgreSQL (hostinqdə 13.x) | Full-text axtarış, JSON, güclü indekslər |
| ORM | Drizzle | TypeScript-də cədvəllər + migration; yüngül |
| Validasiya | zod (client və server eyni sxem) | |
| Şəkil | sharp — yükləmə anında AVIF/WebP, bir neçə ölçü, blur placeholder | Server sorğu zamanı şəkil emal etmir |
| Email | nodemailer (SMTP, `noreply@zavod.az`) | |
| Test | Playwright (E2E + vizual), `node:test` (biznes qaydaları: limitlər, tarif hesabı) | |
| Fon işləri | cPanel Cron → `scripts/jobs/*.mts` | Tarif/vakansiya bitməsi, email-lər, statistika yığımı |

Əlavə ağır kitabxana (UI framework, state manager, CMS) yoxdur. Client-də yalnız interaktiv hissələr işləyir (filtr, modal, yükləmə, reytinq, dil seçici, mobil menyu).

---

## 3. Render strategiyası

Next 16 Cache Components: səhifənin statik karkası əvvəlcədən hazırdır, data hissələri `use cache` + `cacheTag` ilə cache-lənir. Data dəyişəndə yalnız onun teqi yenilənir (= on-demand ISR).

| Səhifə | Strategiya | Cache teqləri |
|---|---|---|
| Qaydalar, Məxfilik, Yardım, Tariflər | SSG | `page:{key}`, `tariffs`, `faq` |
| Ana səhifə | On-demand ISR | `home`, `news`, `factories:list`, `tariffs`, `banners` |
| Tip siyahıları (`/fabrikler`), SEO landing (`/fabrikler/baki`) | On-demand ISR (səhifə 1); digər səhifələr ilk sorğuda yaranır | `factories:list` |
| Kataloq filtrləri (query parametrləri) | Statik karkas + nəticələr streaming ilə; sorğu funksiyası qısa müddətli cache (`cacheLife` ~5 dəq) | `factories:list` |
| Zavod səhifəsi + tablar | On-demand ISR, **build-də yaradılmır**, ilk sorğuda yaranır | `factory:{id}` |
| Məhsul səhifəsi | On-demand ISR | `factory:{id}`, `product:{id}` |
| Xəbərlər (siyahı + daxili) | On-demand ISR | `news`, `news:{id}` |
| Vakansiyalar (siyahı + daxili) | On-demand ISR | `vacancies`, `vacancy:{id}` |
| Axtarış | SSR (dinamik), sorğu nəticəsi qısa cache | — |
| Şəxsi kabinet, admin | SSR, cache yoxdur | — |
| Daxil ol / Qeydiyyat | Statik karkas + Server Actions | — |

- Admin və ya zavod məlumatı dəyişəndə `invalidateTags()` çağırılır. Teqlər bazada (`cache_tags`) qeyd olunur, bütün proseslərə ≤3 saniyəyə çatır (marketinq-dəki həll).
- Reytinq, baxış sayı kimi tez-tez dəyişən rəqəmlər səhifə cache-ini hər dəfə sındırmır: reytinq zavod cache-ini yeniləyir, baxış sayı isə heç vaxt (bölmə 6.4).

---

## 4. Data modeli (əsas cədvəllər)

```
users              id, role(factory|admin), username, email, password_hash, must_change_password, status, created_at
sessions           id, user_id, expires_at                     (httpOnly cookie)
auth_codes         user_id, code_hash, purpose(reset), expires_at, attempts
registration_requests  id, factory_type, factory_name, first_name, last_name, phone, email, status(new|approved|rejected), user_id, created_at

factories          id, user_id, type(zavod|fabrik|sex|emalatxana|kombinat|aqropark), slug, custom_slug,
                   name, about, equipment_text, industry_id, product_type_id, city_id, address,
                   production_models[] , cooperation[], employee_count, capacity_text,
                   phone, email, website, youtube_url, socials(jsonb), logo_id, cover_id,
                   verified, recommended, status(draft|published|hidden),
                   rating_avg, rating_count,              ← denormalizasiya (sürət üçün)
                   tariff_code, tariff_until,
                   search_vector (tsvector, generated),  updated_at
dict_cities / dict_industries / dict_product_types / dict_production_models
                   id, slug, name{az,en,ru}, sort       ← filtr dəyərləri admin-dən idarə olunur
factory_images     factory_id, media_id, sort            (max 6)
factory_certificates  factory_id, media_id, title
factory_files      factory_id, media_id, title           (PDF kataloqlar)
products           id, factory_id, code, slug, name, description, status, updated_at, search_vector
product_images     product_id, media_id, sort            (max 6)
vacancies          id, factory_id, slug, title, city_id, salary, currency, employment_type,
                   published_at, expires_at, description, status
applications       id, vacancy_id, first_name, last_name, email, phone, cv_media_id(private), created_at, deleted_at
ratings            id, factory_id, score(1–5), voter_hash, created_at   (unique factory_id+voter_hash)
media              id, kind(image|pdf|cv), path, variants(jsonb), width, height, blur, size, owner_user_id, is_private
news               id, slug{az,en,ru}, title{…}, excerpt{…}, body{…}, cover_id, published_at, factory_id(nullable)
banners            id, slot, image_id{az,en,ru}, url, active_from, active_to, sort
pages              key, title{…}, body{…}, seo{…}          (qaydalar, məxfilik)
faq                id, question{…}, answer{…}, sort
contact_messages   id, first_name, last_name, email, phone, topic, message, created_at
tariff_plans       code(standart|premium|vip), price_month, price_year, limits(jsonb), features{…}
subscriptions      id, factory_id, plan_code, period(month|year), starts_at, ends_at, status, payment_id
payments           id, factory_id, amount, provider, provider_ref, status, raw(jsonb), created_at
stats_daily        factory_id, day, views, website_clicks, applications   (PK factory_id+day)
notification_prefs user_id, keys(jsonb)                    (xəbər bülleteni checkbox-ları)
redirects          from_path, to_path                      (slug dəyişəndə 301)
cache_tags         tag, invalidated_at
site_settings      key, value(jsonb)                       (header/footer, əlaqə, sosial linklər, SEO default)
```

- Çoxdilli sahələr (`{az,en,ru}`) `jsonb` saxlanır — yalnız admin məzmunu üçün. Zavodun öz məzmunu tək dildə saxlanır.
- Tarif limitləri (məhsul, vakansiya sayı) **serverdə** yoxlanılır (Server Action daxilində, tranzaksiya ilə), UI-da yalnız göstərilir.

---

## 5. URL strukturu (AZ; EN/RU prefikslə, slug-lar tərcümə olunur)

| Səhifə | AZ | EN | RU |
|---|---|---|---|
| Ana səhifə | `/` | `/en` | `/ru` |
| Kataloq | `/kataloq` | `/en/catalog` | `/ru/katalog` |
| Tövsiyə edilənlər | `/kataloq/tovsiyye-edilenler` | … | … |
| Tip siyahısı | `/zavodlar`, `/fabrikler`, `/sexler`, `/emalatxanalar`, `/kombinatlar`, `/aqroparklar` | `/en/factories` … | `/ru/zavody` … |
| SEO landing (tip × şəhər / sahə) | `/fabrikler/baki`, `/fabrikler/qida-senayesi` | … | … |
| Zavod səhifəsi | `/fabrik/agro-trade-supply` | `/en/factory/agro-trade-supply` | … |
| Zavod tabları | `…/media`, `…/mehsullar`, `…/texniki-imkanlar`, `…/vakansiyalar` | | |
| Məhsul | `/fabrik/agro-trade-supply/mehsullar/1519494-mehsulun-adi` | | |
| Vakansiyalar | `/vakansiyalar`, `/vakansiyalar/middle-ux-ui-designer-123` | | |
| Xəbərlər | `/xeberler`, `/xeberler/{slug}` | | |
| Axtarış | `/axtaris?q=…&tab=fabrikler` | | |
| Statik | `/tarifler`, `/elaqe`, `/yardim`, `/istifadeci-qaydalari`, `/mexfilik-siyaseti` | | |
| Auth | `/daxil-ol`, `/qeydiyyat`, `/sifre-berpa` | | |
| Kabinet | `/kabinet`, `/kabinet/mehsullar`, `/kabinet/vakansiyalar`, `/kabinet/vakansiyalar/{id}/muracietler`, `/kabinet/tarifler`, `/kabinet/statistika`, `/kabinet/tenzimlemeler`, `/kabinet/tenzimlemeler/bulleten` | | |
| Admin | `/admin/...` (dil prefiksi yoxdur) | | |

- **Fərdi URL** (`zavod.az/AgroTradeSupply`) → kanonik zavod səhifəsinə **301** yönləndirmə. Kanonik URL həmişə `/fabrik/agro-trade-supply`-dir (SEO üçün tək ünvan).
- Zavodun tipi və ya adı dəyişəndə köhnə URL `redirects` cədvəlinə düşür → 301.

---

## 6. Performans (çox data + sürət)

### 6.1 Hədəflər (Core Web Vitals, mobil 4G)
| Metrik | Hədəf |
|---|---|
| LCP | < 2.0 s |
| CLS | < 0.05 |
| INP | < 200 ms |
| TTFB (cache-dən) | < 200 ms |
| Açıq səhifədə JS (gzip) | ≤ 150 KB (köhnə brauzerlər üçün `noModule` polyfill xaric), bunun içində öz kodumuz ≤ 15 KB — *2026-11-16-da yeniləndi: Next.js + React runtime-ın özü ~136 KB-dır, 100 KB əlçatmazdır; hostinqdə brotli açılır* |
| Kataloq filtr sorğusu (DB) | < 50 ms (10 000 zavod, 300 000 məhsulla) |

### 6.2 Baza
- **İndekslər:** filtr sütunlarına (`type`, `city_id`, `industry_id`, `product_type_id`, `status`), birləşmiş indeks `(status, type, rating_avg DESC, id)`, massivlər üçün GIN (`production_models`, `cooperation`), axtarış üçün GIN (`search_vector`) və trigram GIN (`name`).
- **Denormalizasiya:** `rating_avg`, `rating_count` zavod cədvəlində saxlanır (hər dəfə `AVG()` hesablanmır).
- **Səhifələmə:** "Daha çox göstər" olan yerlərdə (xəbərlər, vakansiyalar, axtarış) **keyset (cursor) pagination** — OFFSET yox. Nömrəli səhifələmədə (kataloq) ümumi say cache-lənir.
- **Yalnız lazımi sütunlar:** kart üçün ayrıca yüngül sorğu (ad, tip, qısa təsvir, şəkil, reytinq) — tam profil yox. N+1 sorğu yoxdur (join / toplu sorğu).
- **Bağlantı hovuzu:** `postgres` client, maks. ~10 bağlantı (shared hosting limiti).
- **Yük testi:** realistik həcmdə seed (10 000 zavod, 300 000 məhsul, 50 000 vakansiya, 5 000 xəbər) ilə `EXPLAIN ANALYZE` və `autocannon` testi — hər əsas sorğu hədəfə uyğun olmalıdır. Bu seed 2-ci addımda yaradılır ki, yavaşlıq əvvəldən görünsün.

### 6.3 Cache
- Açıq səhifələr cache-dən verilir (bölmə 3); DB-yə yalnız data dəyişəndən sonra ilk sorğuda gedilir.
- Lüğətlər (şəhərlər, sahələr) uzun müddətli cache, admin dəyişəndə yenilənir.
- Next cache yaddaşı limitlə (`cacheMaxMemorySize`) — hostinqdə RAM məhduddur.

### 6.4 Statistika (səhifəni yavaşlatmadan)
- Baxış/klik sayı səhifə render-i zamanı yazılmır. Brauzer `navigator.sendBeacon` ilə `/api/stats` göndərir → yaddaşda toplanır → hər ~30 saniyədən bir `stats_daily`-ə toplu `UPSERT`.
- Botlar (User-Agent) sayılmır; eyni ziyarətçi eyni gün bir dəfə sayılır.

### 6.5 Şəkillər və fayllar
- Yükləmə anında sharp ilə AVIF + WebP, 4–6 ölçü, blur placeholder. **Sorğu zamanı şəkil emalı yoxdur** (Next Image Optimization söndürülür, öz loader-imiz hazır variantları seçir) — 1 CPU-nu qoruyur.
- Media faylları Node-dan keçmir: LiteSpeed birbaşa verir, `Cache-Control: immutable, 1 il`.
- `width/height` həmişə verilir (CLS yox), ilk ekrandakı şəkil `priority`, qalanları lazy.
- **CV-lər gizli qovluqda**, yalnız giriş yoxlaması olan route ilə (`/api/files/cv/{id}`) verilir.
- Limitlər: şəkil ≤ 10 MB (sıxılır), PDF ≤ 20 MB, CV ≤ 10 MB (Figma-dakı 200 MB sual altındadır).

### 6.6 Frontend
- Server Components default; client komponent yalnız interaktiv hissədə.
- Filtrlər URL-də saxlanılır (`?tip=fabrik&seher=baki`) — paylaşıla bilir, geri düyməsi işləyir.
- Link prefetch, `loading.tsx` skeletləri Figma kart formasında.
- Lighthouse CI hər PR-da: yuxarıdakı hədəflərdən aşağı düşsə, test qırmızı olur.

### 6.7 Təhlükəsizlik və sabitlik
- Login, şifrə bərpası, əlaqə forması, müraciət, reytinq üçün rate limit (IP hash + DB).
- Şifrə bcrypt, sessiya httpOnly + Secure + SameSite cookie, CSRF Server Actions ilə qorunur.
- Yüklənən faylların tipi məzmuna görə yoxlanılır (yalnız uzantıya görə yox).

---

## 7. SEO

### 7.1 Əsas
- Bütün açıq səhifələr serverdə tam HTML kimi render olunur (Google JS gözləmir).
- Hər səhifənin unikal `title` və `description`-u şablonla yaranır, admin dəyişə bilər:
  - Zavod: `{Ad} — {Tip}, {Şəhər} | Zavod.az`
  - Tip × şəhər: `Bakıdakı fabriklər — siyahı və əlaqə | Zavod.az`
  - Vakansiya: `{Vəzifə} — {Şirkət}, {Şəhər} | Zavod.az`
- `canonical` hər səhifədə (query parametrləri olmadan).
- `hreflang` az / en / ru + `x-default` (AZ).
- Bir səhifədə bir `h1`, başlıq iyerarxiyası düzgün, şəkillərdə `alt`.
- Breadcrumb həm görünür, həm structured data.

### 7.2 Structured data (JSON-LD)
| Səhifə | Schema |
|---|---|
| Hamısı | `Organization` (Zavod.az), `WebSite` + `SearchAction` (Google-da axtarış qutusu), `BreadcrumbList` |
| Zavod | `Organization` / `LocalBusiness`: ad, loqo, ünvan, telefon, sayt, sosial `sameAs`, `aggregateRating` |
| Məhsul | `Product` (ad, şəkil, təsvir, istehsalçı) |
| Vakansiya | **`JobPosting`** (title, description, datePosted, validThrough, employmentType, hiringOrganization, jobLocation, baseSalary) → **Google Jobs**-da görünmə |
| Xəbər | `NewsArticle` |
| Yardım | `FAQPage` |

### 7.3 İndeksləmə qaydaları
- **İndekslənir:** ana səhifə, kataloq, tip səhifələri, SEO landing-lər, zavod, məhsul, vakansiya, xəbər, statik səhifələr.
- **`noindex, follow`:** axtarış nəticələri, filtr kombinasiyaları (landing olmayanlar).
- **Səhifələmə (2-ci, 3-cü… səhifə):** indekslənir, öz canonical-ı var (`?page=2`), amma sitemap-a düşmür.
- **`noindex` + robots-da bağlı:** kabinet, admin, auth, API, test domeni (`SITE_NOINDEX=1`).
- **Boş profil:** minimum məlumatı doldurulmamış zavod (təsvir + şəkil yoxdursa) `noindex` olur — Google "zəif məzmun" görməsin.
- **Bitmiş vakansiya:** sitemap-dan çıxır, səhifə "Müddəti bitib" göstərir, 30 gün sonra 410.

### 7.4 SEO landing səhifələri
- Tip × Şəhər (`/fabrikler/baki`) və Tip × Sahə (`/fabrikler/qida-senayesi`) — yalnız ən azı 3 zavod olan kombinasiyalar indekslənir və sitemap-a düşür. Hər birinin admin-dən yazılan qısa giriş mətni ola bilər.
- Daxili linkləmə: zavod səhifəsində "Oxşar zavodlar", məhsulda "Oxşar məhsullar", footer/kataloqda landing linkləri.

### 7.5 Sitemap və robots
- `sitemap.xml` = indeks; tipə görə ayrı faylar (`factories-1.xml`, `products-1.xml`, `vacancies.xml`, `news.xml`, `landings.xml`, `static.xml`), hər faylda ≤ 50 000 URL, `lastmod` = `updated_at`, hreflang alternativləri ilə.
- `robots.txt` dinamik: test mühitində hər şey bağlı.
- Google Search Console + Bing Webmaster; yeni/dəyişən səhifələr üçün IndexNow (Bing/Yandex).

### 7.6 Sosial paylaşım
- Open Graph + Twitter kartları; zavod üçün cover şəkli, xəbər üçün cover, default OG şəkli admin-dən.

---

## 8. Çoxdillilik

- Routing: AZ prefikssiz, `/en`, `/ru`; `src/proxy.ts` + `src/i18n/routes.ts` (marketinq-dəki yanaşma, əlavə kitabxana yoxdur).
- İnterfeys mətnləri: `src/i18n/dictionaries/{az,en,ru}.ts`.
- Admin məzmunu (xəbərlər, statik səhifələr, FAQ, tariflər, bannerlər, lüğətlər): `{az,en,ru}` sahələri; boş dil AZ-a düşür (fallback) və admin-də qırmızı nişanla göstərilir.
- Zavodun öz məzmunu tək dildədir; EN/RU səhifələrində interfeys tərcümə olunur, zavod mətni olduğu kimi qalır.

---

## 9. Funksional modullar

### 9.1 Qeydiyyat və giriş
1. Zavod "Qeydiyyat üçün müraciət" göndərir (tip, zavodun adı, ad, soyad, telefon, email) → `registration_requests`, admin-ə email.
2. Admin təsdiqləyir → sistem `users` + boş `factories` (draft) yaradır, istifadəçi adı və müvəqqəti şifrəni email-ə göndərir.
3. İlk giriş → məcburi şifrə dəyişmə (≥ 8 simvol) → profil anketi.
4. Şifrə bərpası: email → 4 rəqəmli kod (10 dəq, maks. 5 cəhd) → yeni şifrə.
5. Admin hesabı dayandıra / silə bilər; zavod da profilini silə bilər (təsdiqlə).

### 9.2 Zavod profili
- Anket (Figma "Profilin qurulması") → `factories`; şəkillər (max 6), sertifikatlar, PDF fayllar, YouTube video, cover və loqo, sosial linklər, fərdi URL.
- Profil `published` olur: admin təsdiqindən sonra və minimum sahələr doldurulanda. "Təsdiqlənib" nişanını yalnız admin verir.

### 9.3 Məhsullar və vakansiyalar
- CRUD (kabinet), silmə modalları, tarif limitinin serverdə yoxlanması → limit aşılanda "Tarifinizi dəyişin" modalı.
- Vakansiya müraciəti (açıq səhifədə): ad, soyad, email, telefon, CV (PDF) → zavoda email (bildiriş ayarı açıqdırsa) + kabinetdə müraciətlər cədvəli (yüklə, seçib sil, səhifələmə).

### 9.4 Reytinq
- Hesabsız ziyarətçi qiymət verir (1–5). Bir zavoda bir səs: cookie-dəki anonim ID + IP hash (`voter_hash`); rate limit. Səs `rating_avg`/`rating_count`-u tranzaksiya ilə yeniləyir.

### 9.5 Tariflər və ödəniş
- Planlar `tariff_plans` cədvəlində (qiymət və limitlər admin-dən dəyişir).
- `PaymentProvider` interfeysi: `createCheckout()`, `handleCallback()`, `verify()`. **v1:** "Tarifə qoşul" → `payments` (pending) + admin-ə bildiriş → admin ödənişi təsdiqləyib tarifi aktivləşdirir. Provayder seçiləndə adapter yazılır, kart məlumatları **bankın səhifəsində** daxil edilir (öz saytımızda kart formu yoxdur).
- Cron: bitməyə 7 və 1 gün qalmış email; bitəndə tarif Standart-a düşür, limitdən artıq məhsul/vakansiya silinmir, **gizlədilir** (yenidən ödəyəndə qayıdır).

### 9.6 Statistika
- Kabinetdə: səhifə baxışları, sayta keçidlər, vakansiya müraciətləri, reytinq — gün/ay üzrə (`stats_daily`).

### 9.7 Axtarış
- Postgres full-text (`simple` konfiqurasiya + Azərbaycan hərflərinin normallaşdırılması: ə→e, ı→i, ş→s, ç→c, ğ→g, ö→o, ü→u) + `pg_trgm` oxşarlıq (səhv yazılışa dözümlü).
- Tablar: 6 tip + Xəbərlər; hər tabda nəticə sayı.
- Hero-da canlı təkliflər (debounce 250 ms, maks. 6 nəticə, `/api/search/suggest`, qısa cache).
- `pg_trgm` hostinqdə icazəli deyilsə: normallaşdırılmış sütun + `ILIKE` prefix indeksi (fallback).

### 9.8 Admin panel (`/admin`)
- Dashboard (yeni qeydiyyat müraciətləri, ödənişlər, əlaqə mesajları).
- Qeydiyyat müraciətləri (təsdiq / rədd), Zavodlar (redaktə, təsdiqlənib, tövsiyə, gizlət), Məhsullar və Vakansiyalar (moderasiya), Xəbərlər, Bannerlər (slot + tarix aralığı), Tariflər və Ödənişlər, Lüğətlər (şəhər, sahə, məhsul tipi, istehsalat modeli), Statik səhifələr, FAQ, Əlaqə mesajları, Sayt ayarları (header/footer, əlaqə, sosial, SEO default), Redirect-lər, Adminlər.
- Görünüş marketinq admin paneli üslubunda; Figma-da olmadığı üçün sadə və funksional.

### 9.9 Email-lər
- Qeydiyyat müraciəti alındı (admin-ə), hesab yaradıldı (giriş məlumatları), şifrə bərpa kodu, yeni vakansiya müraciəti, tarif bitir / bitdi, ödəniş təsdiqləndi, əlaqə mesajı (admin-ə). Hamısı 3 dildə şablon.

---

## 10. Qovluq strukturu

```
zavod.az/
├─ docs/                      analiz, spec, planlar
├─ deploy/cpanel/             app.js, deploy.sh, rollback.sh, backup.sh, htaccess (marketinq-dən uyğunlaşdırılır)
├─ scripts/
│  ├─ figma/                  token və asset export
│  ├─ seed/                   admin, lüğətlər, demo və yük testi datası
│  └─ jobs/                   cron: tariff-expiry, vacancy-expiry, stats-flush, emails
├─ drizzle/                   migration-lar
├─ public/                    favicon, statik ikonlar
├─ tests/
│  ├─ e2e/                    Playwright
│  ├─ visual/                 Figma ilə müqayisə
│  └─ unit/                   biznes qaydaları
└─ src/
   ├─ app/
   │  ├─ [lang]/
   │  │  ├─ (site)/           ana səhifə, kataloq, [tip], [tip]/[slug]/…, xeberler, vakansiyalar, axtaris, statik
   │  │  ├─ (auth)/           daxil-ol, qeydiyyat, sifre-berpa
   │  │  └─ kabinet/          layout (sol menyu + giriş yoxlaması) və alt səhifələr
   │  ├─ admin/
   │  ├─ api/                 stats, search/suggest, files/cv, payments/callback
   │  ├─ sitemap.xml/ robots.ts
   │  └─ media/[...path]      (yalnız lokal inkişaf üçün; serverdə LiteSpeed verir)
   ├─ features/               hər mövzu bir qovluq: schema.ts · queries.ts · actions.ts · components/
   │  └─ auth, registration, factories, catalog, search, products, vacancies, applications,
   │     ratings, news, tariffs, payments, stats, banners, pages, contact, seo, admin
   ├─ components/
   │  ├─ ui/                  Button, Input, Textarea, Select, Checkbox, Tabs, Modal, Dropzone,
   │  │                       Pagination, Rating, Breadcrumb, Badge, Card, Skeleton
   │  └─ layout/              Header, MobileMenu, LangSwitcher, Footer, BannerSlot
   ├─ db/                     schema/*.ts, client.ts
   ├─ i18n/                   routes.ts, dictionaries/{az,en,ru}.ts
   ├─ lib/                    auth, cache (tags), media, mail, payments, rate-limit, env, slug
   └─ proxy.ts
```

Qayda: səhifə faylı (`app/...page.tsx`) yalnız `features/*`-dən sorğu və komponent çağırır; biznes məntiqi `features/*/actions.ts` və `queries.ts`-dədir. Bir fayl böyüyəndə bölünür.

---

## 11. Deploy

- **Yer:** marketinq.az və podcast.az ilə eyni hosting.com (A2) cPanel hesabı — Setup Node.js App (Node 22) + PostgreSQL.
- **Domen:** zavod.az addon domain kimi əlavə olunur (DNS hazırda başqa yerdədirsə, nameserver/A record dəyişdirilir). Əvvəlcə `new.zavod.az` test ünvanı, `SITE_NOINDEX=1`.
- **Qovluqlar:** `~/zavod-src` (git, build), `~/zavod-app` (releases, current, shared/.env, shared/uploads, shared/private), `~/zavod-public` (document root, .htaccess, `media` → uploads linki).
- **Yeniləmə:** `bash ~/zavod-src/deploy/cpanel/deploy.sh` — migration, build, keçid; son 3 release saxlanılır, `rollback.sh` ilə geri.
- **Backup:** gündəlik baza dump + uploads, cron 03:30 (marketinq-dən fərqli saatda ki, CPU üst-üstə düşməsin).
- **Resurs riski:** hesabda bu, üçüncü Node tətbiqidir (1 CPU, 4 GB, 150 thread). Thread hovuzları kiçildilir (marketinq-dəki kimi), build gecə edilir, yaddaş izlənilir. Trafik böyüyəndə ayrıca plan və ya VPS-ə köçmək üçün Docker variantı hazır saxlanılır.
- **İlk addımda yoxlanılacaq:** `pg_trgm` / `unaccent` icazəsi, disk kvotası, hesabdakı cari RAM/thread istifadəsi.
- **Opsional:** Cloudflare (pulsuz) — statik və media üçün CDN, DDoS qoruması. Qərar canlıya çıxmazdan əvvəl verilir.

---

## 12. Addım-addım iş planı

| # | Addım | Nəticə |
|---|---|---|
| 0 | Təməl: layihə, Tailwind token-ləri (Figma-dan), Inter, UI kit, Header/Footer/Mobil menyu, i18n, DB + Drizzle, admin girişi, test deploy (`new.zavod.az`) | Boş, amma canlı və düzgün qurulmuş sayt |
| 1 | Statik səhifələr (Qaydalar, Məxfilik, Yardım, Tariflər) + Əlaqə forması + admin hissəsi | İlk real səhifələr |
| 2 | Zavod modeli, lüğətlər, admin-dən zavod əlavə etmək, **yük testi seed-i** → Kataloq + filtrlər + tip səhifələri + SEO landing | Kataloq sürətlə işləyir |
| 3 | Zavod səhifəsi (5 tab) + məhsul səhifəsi + reytinq | |
| 4 | Ana səhifə + Axtarış (canlı təklif daxil) | |
| 5 | Xəbərlər (admin + səhifələr) + bannerlər | |
| 6 | Qeydiyyat müraciəti → admin təsdiqi → ilk giriş → şifrə bərpası | |
| 7 | Profilin qurulması + kabinet (media, sertifikat, fayl, tənzimləmələr, fərdi URL, bülleten) | |
| 8 | Kabinet: məhsullar + vakansiyalar; açıq vakansiya səhifələri + CV müraciəti + müraciətlər cədvəli | |
| 9 | Tariflər, limitlər, ödəniş modulu (v1 əl ilə), statistika, cron email-lər | |
| 10 | SEO yekun (sitemap, structured data yoxlaması, Search Console), Lighthouse, yük testi, canlıya keçid | zavod.az canlı |

Hər addımdan əvvəl: həmin səhifələrin Figma-sı yenidən oxunur, açıq suallar soruşulur, addım üçün ayrıca kiçik plan yazılır. Hər addımın sonunda: **Figma ilə həndəsə + vizual yoxlama (bölmə 1.1, bənd 6) keçməlidir** + E2E test + test domenə deploy.

---

## 13. Açıq suallar (aid olduğu addımda soruşulacaq)

| Sual | Addım |
|---|---|
| Footer-dəki "Xidmətlər" linki hara aparır? | 0 |
| Əlaqə formasında "Mövzu" seçimləri hansılardır? | 1 |
| Filtr dəyərləri (sahələr, məhsul tipləri, şəhərlər) — hazır siyahı varmı? | 2 |
| Qeydiyyatda niyə yalnız 3 tip var (6 əvəzinə)? | 6 |
| Fərdi URL zavod tərəfindən sərbəst seçilirmi? | 7 |
| CV limiti (Figma-da 200 MB) — 10 MB olsun? | 8 |
| Premium vakansiya limiti: 3 yoxsa 50? | 9 |
| Ödəniş provayderi | 9 |
| Cloudflare istifadə edək? | 10 |
