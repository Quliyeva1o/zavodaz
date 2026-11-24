# Zavod səhifəsi sorğularının performansı (Addım 3, Tapşırıq 6a)

## Mühit və üsul

- Mühit: Windows 11, Docker-də PostgreSQL 13.23 (`localhost:5442`), ayrıca `zavod_load` bazası. Dev bazası (`zavod`) toxunulmazdır.
- Məlumat (`npm run db:seed-load`, `mulberry32(42)`, 1000-lik batch-lər, deterministik):
  - 20 000 zavod (17 044 `published`), hər birində avadanlıq mətni, işçi sayı, tutum, əlaqə sütunlarının bir hissəsi doldurulub;
  - hər dərc olunmuş zavoda 0–30 məhsul: cəmi 253 830 (~90% `published`, qalanı `draft`/`hidden`), şəkilsiz; sitemap-a düşən 228 429;
  - hər dərc olunmuş zavoda 0–5 vakansiya: cəmi 42 494 (~10% `draft`, ~30% bitmiş `expires_at`, bəziləri müddətsiz);
  - 5 000 köhnə slug yönləndirməsi;
  - `load-1` zavoduna 2 000 səs, qalan zavodlara 1–3 səs (cəmi ~36 000), ki `ratings` real paylanmaya malik olsun;
  - seed sonunda `vacuum analyze`.
- Ölçmə: `npm run perf:factory` (`scripts/perf/factory.mts`). Skript tətbiqin real funksiyalarını (`factory-sql.ts`, `sitemap-sql.ts`, `rating-sql.ts`) işlədir, drizzle-in göndərdiyi hər `SELECT`-i tutur və eyni ifadəni `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` ilə 5 dəfə icra edir. Cache yoxdur. Nümunə zavod: ən çox dərc olunmuş məhsulu olan (30), vakansiya üçün ən çox açıq vakansiyası olan.
- Qapı: hər `SELECT`-in SQL medianı ≤ 50 ms və `factories`, `products`, `vacancies`, `ratings` üzərində seq scan yoxdur. İstisna yalnız aşağıda sənədləşdirilmiş aqreqatlardır (`allowSeq`, `budget`). "Divar" sütunu funksiyanın bütöv vaxtıdır (bağlantı gediş-gəlişi və sətirlərin ötürülməsi daxil), məlumat üçündür.
- `media` cədvəli yük bazasında boşdur, ona görə şəkil join-lərində planda `media` üzərində seq scan görünür; real məlumatda `media_pkey` istifadə olunur.
- `castVote`: tam tranzaksiya (kilid, upsert, aqreqat, update) divar vaxtı ilə, EXPLAIN isə yalnız aqreqat/seçim `SELECT`-ləri üçün (yazı ifadələri məlumatı dəyişərdi).

## Nəticələr

| Sorğu | Divar ilk / median, ms | SQL (ilk / median, ms) | Plan / indeks |
|---|---|---|---|
| zavod slug-la (əsas səhifə) | 12.3 / 7.9 | əsas sətir 0.10; şəkil, sertifikat, fayl siyahıları ≤ 0.10 | `factories_slug_unique`, `media_pkey` (cover/logo); `factory_images_*_pk`, `factory_certificates_factory_idx`, `factory_files_factory_idx` |
| Məhsullar tabı, səhifə 1 | 6.8 / 5.5 | siyahı 0.05, say 0.04, əsas şəkil 0.06 | `products_factory_list_idx`; şəkil: `product_images_*_pk` |
| Məhsullar tabı, dərin (son) səhifə | 4.1 / 4.1 | siyahı 0.12, say 0.06 | `products_factory_list_idx` |
| məhsul koda görə | 3.0 / 3.0 | 0.05 + şəkillər 0.05 | `products_pkey`, `product_images_*_pk` |
| oxşar məhsullar | 3.2 / 3.3 | 0.05 + şəkillər 0.05 | `products_factory_list_idx` |
| Vakansiyalar tabı, səhifə 1 | 4.4 / 2.9 | siyahı 0.09, say 0.04 | `vacancies_factory_list_idx` |
| `findProductSlug` (proxy) | 1.8 / 1.8 | 0.05 | `products_pkey` + `factories_slug_unique` |
| yönləndirmə xəritəsi yükü (5 000 sətir) | 11.0 / 6.9 | 0.39 | seq scan `redirects` (kiçik cədvəl, tam oxunur; proxy-də yalnız dəyişəndə yüklənir) |
| sitemap: zavod sayı | 2.2 / 2.2 | 1.5 | index-only `factories_pub_rating_asc_idx` |
| sitemap: zavod, 1-ci 16 666 | 42.5 / 42.5 | 10.8 | seq scan `factories` (sənədləşdirilmiş aqreqat, aşağıda) |
| sitemap: məhsul sayı | 35.8 / 26.4 | 37.5 / 31.8 | seq scan `products` + `factories` ilə hash join (aqreqat) |
| sitemap: məhsul, 1-ci 16 666 | 47.4 / 47.4 | 20.3 | `products_pkey` + `factories_pkey` |
| sitemap: məhsul, son hissə (13) | 151.6 / 151.6 | 212.6 / 200.8 (təkrarlarda 150–210) | seq scan + hash join + sort (aqreqat, aşağıda) |
| `castVote` (2 000 səsli zavod) | 19.0 / 9.2 | zavod 0.07, səslər 0.42 | `factories_slug_unique`, `ratings_factory_id_voter_hash_pk` |

Rəqəmlər bir işə salmadan götürülüb; təkrar işə salmalarda divar vaxtları ±30% dəyişir, SQL rəqəmləri sabitdir.

## Sənədləşdirilmiş istisnalar

Sitemap-lar bütün cədvəl üzrə aqreqatdır və seq scan düzgün plandır. Üstəlik onlar `cacheLife("hours")` ilə keşlənir və yalnız axtarış robotları və ya keş yenilənəndə işləyir, heç vaxt istifadəçi sorğusunun yolunda deyil.

- Zavod və məhsul sayı, zavod hissəsi: ≤ 50 ms qapısındadır (SQL 10.8 / 31.8 ms).
- **Məhsul sitemap-ının son hissələri** (offset ~216 000): SQL ~150–210 ms, qapı `budget: 250` ilə. Səbəb: `OFFSET` dərinləşdikcə PostgreSQL bütün 228 429 sətri `id` üzrə sıralayır (diskə axan sort). Yoxlandı: `products (id) where status = 'published'` qismən indeksi planı dəyişmir (planlaşdırıcı yenə hash join + sort seçir), ona görə indeks əlavə olunmadı və miqrasiya yoxdur.

## Nəticələr və tövsiyələr

- Bütün istifadəçi yolundakı sorğular (zavod, tablar, məhsul, oxşar, vakansiya, proxy lookup, səs) SQL-də ≤ 0.5 ms, bütöv funksiya isə ≤ 20 ms-dir. 20 000 zavod və 250 000 məhsulda yeni indeks lazım olmadı: `products_factory_list_idx`, `vacancies_factory_list_idx` (DESC sütunlar `NULLS FIRST`, `ORDER BY ... DESC` ilə tam üst-üstə düşür) və `ratings` PK-sı kifayət edir.
- `castVote` aqreqatı 2 000 səsli zavodda 0.4 ms-dir (PK indeksi ilə); zavod sətri kilidi tranzaksiyanı sıralayır, ölçü problemi yoxdur.
- Proxy-nin redirect xəritəsi 5 000 sətirdə 0.4 ms SQL ilə yüklənir; yalnız teq dəyişəndə yenidən yüklənir.
- Gələcək: məhsul sayı ~1 milyonu keçərsə məhsul sitemap-ının son hissələri üçün `OFFSET` əvəzinə keyset (`id > son_id`) lazım olacaq; indi (228 mindən ~14 hissə, keşlənmiş) ehtiyac yoxdur.
- Yenidən yaratmaq: `npm run db:seed-load` (20 000 zavod, ~1 dəqiqə), sonra `npm run perf:factory`.
