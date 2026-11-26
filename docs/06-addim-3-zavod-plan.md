# Addım 3 — Zavod səhifəsi, məhsullar və reytinq: icra planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking. **Yüngül proses** (istifadəçi qərarı 2026-11-23): hər tapşırığa bir review; Critical/Important bir dövrədə düzəlir, controller testlərlə yoxlayır (ayrıca re-review agenti yoxdur); minor-lar addımın sonunda toplu; addım sonunda bütöv-branch final review + `visual:check`.

**Məqsəd:** Zavodun öz səhifəsi 5 tab ilə 3 dildə açılır:
- **Haqqında**
- **Media**
- **Məhsullar**
- **Texniki imkanlar**
- **Vakansiyalar**

Bundan əlavə:
- məhsul səhifəsi və "Oxşar məhsullar" bloku işləyir;
- ziyarətçi zavodu qiymətləndirə bilir;
- admin bütün məzmunu daxil edir (kabinet 7–8-ci addımlarda gələcək);
- kataloqdakı "Ətraflı" linki işlək olur.

**Arxitektura:**
- **Oxunuş:**
  - zavod və onun alt məlumatı slug ilə oxunur;
  - nəticə `use cache` + `factoryTag(id)` ilə saxlanılır;
  - admin yazanda, eləcə də səs veriləndə həmin teq yenilənir.
- **Səhifə marşrutları:**
  - tablar ayrıca URL-dir (SEO), hamısı eyni `FactoryShell`-i istifadə edir;
  - məhsullar tabında səhifələmə `?page`-dir, render bloklayandır (R12).
- **Şəkillər və fayllar:**
  - şəkillər 2-ci addımın media sistemi ilə işlənir;
  - PDF kataloqlar media-ya yeni `pdf` növü kimi əlavə olunur.
- **Reytinq:**
  - server action ilə yazılır, anonimdir;
  - səsçi kimliyi cookie ID + IP hash ilə müəyyən edilir;
  - `ratings` cədvəlinə yazıldıqdan sonra eyni tranzaksiyada zavodun `rating_avg` və `rating_count` dəyərləri yenilənir.
- **Slug dəyişəndə 301:** köhnə ünvan `redirects` cədvəlinə yazılır. Səhifə slug-ı tapmayanda bu cədvələ baxır və `permanentRedirect` edir (2-ci addımdakı R19 öhdəliyi).

**Spec:** [02-spec.md](02-spec.md) — §4 (factories, factory_images, factory_certificates, factory_files, products, product_images, vacancies, ratings, redirects), §5, §7, §9.2–9.4 · Figma inventarı: [01-figma-analiz.md](01-figma-analiz.md) §4.4 · Əvvəlki plan: [05-addim-2-katalog-plan.md](05-addim-2-katalog-plan.md)

**Branch:** `addim-3-zavod`, `main`-dən (d6e7934).

## Ümumi qaydalar

- **UI (istifadəçi qərarı 2026-11-23):** Figma-ya yaxın olmalıdır.
  - Ölçülər `npm run figma:inspect`-dən götürülür; Figma ilə yoxlama addımın sonunda bir dəfə aparılır (Tapşırıq 6).
  - Figma-nın öz uyğunsuzluqlarında ən sadə ağlabatan həll seçilir və hesabatda qeyd olunur.
  - Figma API tez-tez 429 verir. Bu halda lokal nüsxə istifadə olunur, `inspect` buna avtomatik keçir.
- **Prioritet funksionallıq və sürətdir.**
  - JS büdcəsi ≤ 150 000 B-dır, ehtiyat cəmi ~495 B qalıb. Yeni client kodu yalnız lazy yüklənir (reytinq modalı, qalereya böyüdücüsü).
  - Hər yeni client komponenti `npm run perf:js` ilə ölçülür.
  - Lazım gələrsə qənaət edilir: `MobileFilterButton`-da `next/dynamic` → `import()`, AutoSubmit kiçildilir.
- **Token qaydası:** rəng və text style yalnız `tokens.css`-dəndir; yeni üslublar generator vasitəsilə əlavə olunur.
- **Dil:** istifadəçi mətnləri lüğətlərdə saxlanılır (AZ/EN/RU).
- **Zavodun öz məzmunu tək dildədir (spec §4).** Bu, haqqında, avadanlıq və məhsul mətnlərinə aiddir; hamı eyni mətni görür.
- **Admin:**
  - hər admin səhifəsi və action-ı `requireAdmin()` çağırır;
  - zod xəta mesajları Azərbaycancadır;
  - xətada daxil edilmiş dəyərlər itmir;
  - hər yazıdan sonra `invalidateTags` çağırılır.
- **Testlər:**
  - TDD: unit və e2e testi əvvəl yazılır;
  - `npm run typecheck && npm run lint && npm run test:unit`;
  - e2e üçün `npm run build`, 3100-də server (öz başlatdığını dayandır), `npx playwright test`;
  - e2e öz məlumatını izolə edir (R1: `e2e-` prefiksi).
- **Commit:** Azərbaycanca, sonda `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Mühit:** Docker DB `localhost:5442`. Kompüter yenidən başlayanda Docker Desktop-u istifadəçi açır, DB yoxdursa BLOCKED bildir.

## Controller qərarları (plan anında)

- **Kim doldurur:** 7–8-ci addımlara (kabinet) qədər bütün zavod məzmununu admin daxil edir: şəkillər, sertifikatlar, PDF-lər, məhsullar.
- **Vakansiyalar:**
  - `vacancies` cədvəli indi spec-ə uyğun yaradılır;
  - vakansiya CRUD-u və açıq vakansiya səhifəsi 8-ci addımdadır;
  - indi tab siyahını göstərir, boşdursa boş hal görünür;
  - kartın linki `/vakansiyalar/<slug>`-dır və 8-ci addıma qədər 404 verir;
  - Figma yoxlaması üçün fixture sətir yazır.
- **Məhsul kodu:** 7 rəqəmli avtomatik nömrədir (`products.id` sequence-i 1 000 000-dan başlayır). URL `…/mehsullar/1519494-mehsulun-adi` formasındadır (spec §5).
- **"Oxşar məhsullar":** eyni zavodun digər ən yeni 6 məhsulu.
- **Reytinq:**
  - Səsçi bir cihaz/IP üçün zavoda bir səs verir və sonradan onu dəyişə bilər (upsert).
  - Limit IP başına saatda 20 səsdir.
  - Səsçi kimliyi `voter_hash = sha256(anon_cookie_id + ip_hash)` ilə müəyyən edilir; `IP_HASH_SALT` 1-ci addımdakı kimidir.
  - Səs zavod səhifəsinin teqini dərhal yeniləyir.
  - Kataloq kartlarındakı reytinq 1 saata qədər köhnə qala bilər: kataloq sorğusu `cacheLife("hours")` olur. Hər səsdə bütün kataloq keşini silmək olmaz.
- **JSON-LD:**
  - zavod səhifəsində `Organization`; `AggregateRating` qoyulmur, çünki Google-un "self-serving review" qaydası buna icazə vermir;
  - məhsul səhifəsində `Product` (name, image, description, brand = zavod), `offers`-siz;
  - hər iki səhifədə `BreadcrumbList`.
- **YouTube:** "facade" istifadə olunur. Əvvəlcə önizləmə şəkli (`i.ytimg.com`) göstərilir, klikləyəndə `youtube-nocookie.com` iframe-i yüklənir. Səhifə yüklənəndə YouTube JS-i yüklənmir.
- **PDF kataloqlar:**
  - limit 20 MB-dır (Figma-dakı "100Mb/240Mb" nümunədir);
  - fayl ancaq magic bytes `%PDF-` olduqda qəbul edilir;
  - `/media/<id>/file.pdf` ünvanından `Content-Disposition: inline` başlığı ilə verilir;
  - ölçüsü kartda göstərilir.
- **Sağ sütundakı banner** 5-ci addımda gələcək; bu addımda yalnız əlaqə kartı qurulur.
- **Mobil Məhsullar və məhsul səhifəsi Figma-da yoxdur.** Desktop və digər mobil tabların naxışından qurulur: mobil kart 2-ci addımdakı kimidir, qrid 1 sütunludur.
- **Tab URL-ləri:**

  | Tab | AZ | EN | RU |
  |---|---|---|---|
  | Haqqında | `/fabrik/<slug>` | `/en/factory/<slug>` | `/ru/fabrika/<slug>` |
  | Media | `…/media` | `…/media` | `…/media` |
  | Məhsullar | `…/mehsullar` | `…/products` | `…/produkciya` |
  | Texniki imkanlar | `…/texniki-imkanlar` | `…/capabilities` | `…/vozmozhnosti` |
  | Vakansiyalar | `…/vakansiyalar` | `…/vacancies` | `…/vakansii` |
  | Məhsul | `…/mehsullar/<kod>-<slug>` | `…/products/<kod>-<slug>` | `…/produkciya/<kod>-<slug>` |

  Məhsul URL-ində yanlış slug hissəsi düzgün URL-ə 301 ilə yönləndirilir; həqiqi açar koddur.
- **Kart linkləri:** 2-ci addımdakı kart linki (`factoryHref`) dəyişmir, Haqqında tabına aparır.
- **Gizli və draft zavodlar:**
  - 404 verir;
  - kataloqda görünmür;
  - draft zavodu admin "Önizlə" linki ilə görə bilər (`?preview=1` yalnız admin sessiyası ilə; keşlənmir).

---

### Tapşırıq 1: Məlumat modeli, media PDF, URL-lər və redirect-lər

**Fayllar:**
- Dəyiş:
  - `src/db/schema.ts`;
  - yeni miqrasiya (`npm run db:generate`);
  - `src/i18n/routes.ts` + `tests/unit/routes.test.ts`;
  - `src/features/media/*` (pdf);
  - `src/app/media/[...path]/route.ts`;
  - `src/lib/cache/tag-store.ts` (`factoryTag(id)`).
- Yarat:
  - `src/features/factory/queries.ts` (`getFactoryBySlug`, `getFactoryProducts`, `getProduct`, `getSimilarProducts`, `getFactoryVacancies`, `resolveRedirect`);
  - `src/features/factory/slug-redirect.ts`;
  - unit və DB testləri.

**Sxem (spec §4):**
- **`factories`-ə əlavə sütunlar:**
  - `legal_name` — "Agro Trade Supply MMC";
  - `logo_id`;
  - `equipment_text`;
  - `employee_count`;
  - `capacity_text`;
  - `phone`, `email`, `website`, `address`, `youtube_url`;
  - `socials jsonb` (6 şəbəkə).
- **Yeni cədvəllər:**
  - `factory_images`: `factory_id`, `media_id`, `sort`; maksimum 6;
  - `factory_certificates`: `factory_id`, `media_id`, `title`, `sort`;
  - `factory_files`: `factory_id`, `media_id` (pdf), `title`, `sort`;
  - `products`: `id` bigserial 1 000 000-dan, `factory_id`, `slug`, `name`, `description` (≤400), `status`, `created_at`, `updated_at`;
  - `product_images`: maksimum 6;
  - `vacancies` (spec §4 sütunları);
  - `ratings`: `factory_id`, `voter_hash`, `score` 1–5, `updated_at`; unikal (`factory_id`, `voter_hash`);
  - `redirects`: `from_path` PK, `to_path`, `created_at`.
- **İndekslər:**
  - `products (factory_id, status, created_at desc nulls first, id desc nulls first)` — 2-ci addımdakı NULLS dərsi;
  - `vacancies (factory_id, status, published_at desc)`.
- **`media`:**
  - `kind` `image|pdf` olur, `variants` pdf üçün boşdur;
  - `deleteImage`/`sweep`-in istinad yoxlamasına yeni cədvəllərdəki bütün `media_id` sütunları əlavə olunur (2-ci addımdakı xəbərdarlıq);
  - `saveFile(file)` pdf qəbul edir: magic bytes, 20 MB.
- **URL-lər:**
  - `factoryHref(slug, lang, tab?)` və `productHref(factorySlug, product, lang)` (cədvəl yuxarıdadır);
  - `resolvePublicPath` `/fabrik/<slug>[/<tab>[/<kod-slug>]]` yollarını daxili `/[lang]/factory/[slug]/[[...rest]]`-ə çevirir; tab seqmenti dilə görə yoxlanılır;
  - `switchLocalePath` tab və məhsul yollarını tərcümə edir.
- **Redirect-lər:**
  - admin zavodun slug-ını dəyişəndə köhnə yolun bütün dil variantları `redirects`-ə yazılır;
  - lüğət slug-ı dəyişəndə landing yolları da yazılır (2-ci addımdakı R19);
  - `resolveRedirect(path)` keşlidir (`REDIRECTS_TAG`);
  - zəncir qısaldılır: A→B, sonra B→C olanda A→C yazılır.
- **Keş:** kataloq sorğusu `cacheLife("hours")` olur (reytinq qərarı).

**Testlər:**
- routes: hər tab və məhsul, 3 dil, səhv dilin seqmenti → `notFound`;
- `productKey("1519494-mehsulun-adi")` → kod;
- redirect zənciri;
- pdf magic bytes;
- DB testi (rollback tranzaksiyası): sorğular, oxşar məhsullar, gizli zavod `null`.

**Commit-lər:** sxem + media → URL-lər + redirect-lər.

### Tapşırıq 2: Admin — zavod məzmunu və məhsullar

**Fayllar:** `src/app/admin/(panel)/factories/[id]/…` (bölmələr), `…/factories/[id]/products/…`, `src/features/factory/admin.ts`, testlər.

- **Zavod formuna əlavələr:**
  - hüquqi ad, loqo;
  - avadanlıq mətni, işçi sayı, istehsal gücü;
  - telefon, e-mail, sayt, ünvan, YouTube linki (yalnız `youtube.com` / `youtu.be`, video ID çıxarılır), sosial şəbəkələr (URL doğrulaması, `https?://`).
- **Ayrı bölmələr** (zavod redaktə səhifəsində tablar):
  - **Şəkillər:** maksimum 6, yüklə / sil / sırala (yuxarı-aşağı düymələri, JS-siz də işləyir).
  - **Sertifikatlar:** başlıq + şəkil.
  - **PDF kataloqlar:** başlıq + fayl.
- **Məhsullar:**
  - siyahı (zavod üzrə);
  - yarat / redaktə: ad, təsvir 0/400, maksimum 6 şəkil, status;
  - silmə: şəkilləri də silinir, istinad yoxlaması var.
- **Yükləmələr** 2-ci addımın `POST /api/admin/media` route-u ilə gedir; route pdf-i də qəbul edir.
- **Slug dəyişikliyi** `redirects` yazır (Tapşırıq 1).
- **Önizlə:** draft zavod üçün link (`?preview=1`, yalnız admin).
- **Teqlər:** hər yazı `factoryTag(id)` və lazım olduqda `FACTORIES_TAG` teqini yeniləyir.
- **E2e:**
  - zavodun tam doldurulması → zavod səhifəsində görünür;
  - məhsul əlavə et → məhsullar tabında görünür;
  - slug dəyiş → köhnə URL 301;
  - girişsiz yeni bölmələr → `/admin/login`.

### Tapşırıq 3: Zavod səhifəsi — başlıq, sağ sütun, Haqqında, Media, Texniki imkanlar, Vakansiyalar

**Figma:**
- desktop: `312:11599` (Haqqında), `368:12413` (Media), `361:10709` (Texniki imkanlar), `357:10356` (Vakansiyalar);
- mobil: `762:22809`, `773:24771` / `775:22833` / `775:23288` (Media halları), `773:24393`, `770:24037`.

**Fayllar:** `src/app/[lang]/factory/[slug]/[[...rest]]/page.tsx`, `src/components/factory/*` (`FactoryShell`, `FactoryHeader`, `ContactCard`, `TabNav`, `FeatureCards`, `MediaGallery`, `YouTubeFacade`, `CertificateGrid`, `VacancyCard`), lüğətlər, e2e.

**Davranış:**
- **Başlıq:**
  - cover, loqo, "Təsdiqlənib", ad, tip, hüquqi ad;
  - reytinq ulduzları + rəqəm;
  - "Qiymətləndir" düyməsi (modal Tapşırıq 5-də).
- **Tab naviqasiyası:**
  - hər tab link-dir (`aria-current="page"`);
  - mobil versiyada üfüqi scroll olur.
- **Haqqında:**
  - mətn;
  - 6 xüsusiyyət kartı: lüğət adları `pick` ilə, boş dəyər "-" kimi (Figma);
  - media önizləmə: ilk 3 şəkil + "Media" linki.
- **Media:**
  - YouTube facade;
  - şəkil qridi;
  - böyüdücü: lazy client, `<dialog>`, klaviatura ilə idarə, `useModalDialog`.
- **Texniki imkanlar:** avadanlıq mətni (sətir keçidləri saxlanılır) + sertifikatlar qridi.
- **Vakansiyalar:**
  - siyahı, 8-lik;
  - "Daha çox göstər" `?page` linkidir, JS-siz də işləyir;
  - boş halda boş hal mesajı.
- **Sağ sütun:** əlaqə kartı.
  - telefon `tel:`;
  - e-mail `mailto:`;
  - sayt `rel="nofollow noopener" target=_blank`;
  - ünvan, sosial ikonlar.
- **Metadata:**
  - title "Ad — Tip | Zavod.az";
  - description haqqında mətnindən, 160 simvola qədər;
  - canonical, hreflang, `Organization` + `BreadcrumbList`;
  - tab səhifələrinin canonical-ı özləridir.
- **Səhifə vəziyyəti:**
  - slug tapılmadıqda: `resolveRedirect` → 301, yoxdursa 404;
  - gizli və draft: 404 (admin önizləməsi xaricində).
- **E2e:**
  - fixture zavod → 5 tab, hər birinin URL-i və h1-i;
  - 3 dil;
  - 404 və 301;
  - YouTube iframe yalnız klikdən sonra yaranır;
  - kataloq kartı → zavod səhifəsi;
  - `perf:js` ≤ 150 000 B.

### Tapşırıq 4: Məhsullar tabı və məhsul səhifəsi

**Figma:** `368:12095` (Məhsullar), `382:11083` (məhsul daxili); mobil yoxdur, qərara bax.

- **Məhsullar tabı:**
  - PDF kataloq kartları: ad, ölçü (MB, `Intl.NumberFormat`), link;
  - məhsul qridi: 12-lik, kod / ad / təsvir, səhifələmə 2-ci addımın `Pagination`-ı ilə;
  - `page` > son səhifə: soft-404 (R11 naxışı).
- **Məhsul səhifəsi:**
  - qalereya: əsas şəkil + miniatürlər; JS-siz ilk şəkil, miniatür linkləri anchor-dur, istəyə görə lazy client;
  - kod, ad, təsvir;
  - "Oxşar məhsullar" (6);
  - `Product` + `BreadcrumbList` JSON-LD;
  - yanlış slug: 301 düzgün URL-ə;
  - məhsul gizlidirsə və ya zavod gizlidirsə: 404.
- **Sitemap:**
  - zavodlar və məhsullar ayrıca sitemap fayllarıdır: `generateSitemaps`, hər fayl ≤ 50 000 URL;
  - tablar sitemap-ə düşmür, yalnız əsas zavod URL-i;
  - məhsullar düşür;
  - `lastModified` = `updated_at`.
- **E2e:** tab → məhsul → oxşar məhsul; səhifələmə; sitemap-də zavod və məhsul URL-ləri; 3 dil.

### Tapşırıq 5: Reytinq

**Figma:** `368:11063` (seçim), `368:11506` (Təsdiqlə), `368:11779` (Təşəkkür); mobil `767:23309` / `767:23552` / `767:23800`.

- **Modal:**
  - lazy yüklənir (düyməyə klikdə);
  - `useModalDialog` istifadə olunur;
  - 5 ulduz radio qrupu kimidir: klaviatura oxları işləyir, hər ulduzun `aria-label`-i var;
  - "Təsdiqlə" düyməsi seçim olana qədər deaktivdir;
  - uğurda "Təşəkkür edirik!" halı göstərilir;
  - xəta Azərbaycanca göstərilir.
- **Server action `rateFactory(slug, score)`:**
  - zod ilə yoxlanılır: score 1–5;
  - anonim cookie: `zv_voter`, uuid, httpOnly, 1 il;
  - `ip_hash`;
  - limit: `consumeAttempt`, saatda 20;
  - bir tranzaksiyada: `ratings` upsert, sonra `factories.rating_avg` və `rating_count` aqreqatla yenidən hesablanır;
  - `factoryTag(id)` dərhal yenilənir; kataloq 1 saata qədər köhnə qala bilər (qərar).
- **Göstəriş:** səhifədə əvvəlki səs varsa, modalda seçili göstərilir (cookie ilə, keşsiz kiçik sorğu).
- **Testlər:**
  - unit: aqreqat hesabı;
  - DB: eyni səsçi iki dəfə → `count` 1, `avg` yenilənir;
  - e2e: modal axını, 3 hal, limit, dəyişdirilmiş səs.
- **JS:** modal chunk-ı ilk yükləmədə yoxdur, `perf:js` ≤ 150 000 B.

### Tapşırıq 6: Figma yoxlaması, fixture, sürət

- **Fixture:** `db:seed-figma` genişlənir — "Agro Trade Supply" zavodu Figma məlumatı ilə:
  - 6 şəkil, sertifikatlar, 2 PDF, 12+ məhsul, 8 vakansiya;
  - şəkillər `figma:assets`-dən götürülür, API 429 versə controller brauzerdən export edir.
- **Hədəflər (desktop və mobil):** başlıq + tab nav + hər tab məzmunu + sağ sütun + məhsul səhifəsi + reytinq modalının 3 halı.
  - Mobil Məhsullar və məhsul səhifəsi üçün hədəf yoxdur (Figma-da yoxdur).
  - Figma uyğunsuzluqları alias/ignore ilə qeyd olunur, səbəbi yazılır.
- **Sürət:**
  - `perf:catalog`-a zavod səhifəsi və məhsul sorğuları əlavə olunur;
  - yük seed-inə hər zavoda 0–30 məhsul əlavə olunur;
  - hədəf ≤ 50 ms;
  - `perf:js` ≤ 150 000 B.
- **Tam yoxlama:**
  - typecheck, lint, unit;
  - tam e2e;
  - `visual:check` — 1–3-cü addımların bütün hədəfləri;
  - `perf:js`, `perf:catalog`.

---

## Addım 3 bitdi sayılır, əgər:

- [ ] Zavod səhifəsi 5 tab ilə 3 dildə açılır. Kataloq kartı oraya aparır. Gizli və draft zavod 404 verir, köhnə slug 301 verir.
- [ ] Məhsullar tabı (PDF + qrid + səhifələmə) və məhsul səhifəsi ("Oxşar məhsullar" ilə) işləyir. Sitemap-də zavodlar və məhsullar var.
- [ ] Reytinq işləyir: modalın 3 halı, bir səsçi bir səs (dəyişə bilər), limit, aqreqat düzgündür.
- [ ] Admin bütün zavod məzmununu və məhsulları idarə edir. Hər dəyişiklik səhifədə dərhal görünür.
- [ ] YouTube və böyüdücü ilk yükləmədə JS yükləmir. `perf:js` ≤ 150 000 B, sorğular ≤ 50 ms.
- [ ] typecheck, lint, unit, e2e və `visual:check` yaşıldır.
