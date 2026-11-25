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
| sitemap: zavod sərhədləri (hər 16 666-cı id; keşlənir) | 7.9 / 8.1 | 9.1 | window aqreqat, index-only `factories_pub_rating_asc_idx` |
| sitemap: zavod, 1-ci hissə (id aralığı) | 35.6 / 33.6 | 9.7 | seq scan `factories` (hissə cədvəlin 80%-idir) |
| sitemap: zavod, son hissə (1) | 4.5 / 4.4 | 1.0 | `factories_pkey` |
| sitemap: məhsul max id (fayl sayı) | 1.8 / 1.4 | 0.09 | `products_pkey` |
| sitemap: məhsul, 1-ci hissə (id aralığı) | 53.4 / 46.1 | 13.9 | `products_pkey` aralıq skan + `factories` hash join |
| sitemap: məhsul, son hissə (15; id aralığı) | 15.6 / 15.6 | 7.2 | `products_pkey` aralıq skan + `factories` hash join |
| `castVote` (2 000 səsli zavod) | 19.0 / 9.2 | zavod 0.07, səslər 0.42 | `factories_slug_unique`, `ratings_factory_id_voter_hash_pk` |

Rəqəmlər bir işə salmadan götürülüb; təkrar işə salmalarda divar vaxtları ±30% dəyişir, SQL rəqəmləri sabitdir.

## Sənədləşdirilmiş istisnalar

Sitemap hissələri `OFFSET` deyil, indeksli aralıqdır (R12): məhsullar `id` aralığı ilə (`[1 000 000 + n·16 666, …)`, hissə ≤ 16 666 məhsul = ≤ 49 998 URL), zavodlar hər 16 666-cı `id`-dən götürülmüş və keşlənmiş sərhədlərlə. Dərin hissə də ilk hissə kimi `products_pkey` aralıq skanıdır: son (15-ci) məhsul hissəsi SQL-də ~7 ms (əvvəl OFFSET ilə 150–210 ms), qapı hər yerdə 50 ms.

- `factories`-də seq scan 1-ci hissələrdə (zavod, məhsul ilə join) `allowSeq` ilə icazəlidir: hissə cədvəlin böyük payını oxuyur, hash join üçün planlaşdırıcı tam oxumanı seçir (SQL ≤ 14 ms).
- Zavod sərhədləri window aqreqatdır (bir keçid, ~9 ms); `cacheLife("hours")` + `FACTORIES_TAG` ilə keşlənir, istifadəçi yolunda deyil. Məhsul id-lərində boşluqlar (silinmiş/dərc olunmamış) hissəni yalnız kiçildir, 50 000 limiti pozulmur.

## Nəticələr və tövsiyələr

- Bütün istifadəçi yolundakı sorğular (zavod, tablar, məhsul, oxşar, vakansiya, proxy lookup, səs) SQL-də ≤ 0.5 ms, bütöv funksiya isə ≤ 20 ms-dir. 20 000 zavod və 250 000 məhsulda yeni indeks lazım olmadı: `products_factory_list_idx`, `vacancies_factory_list_idx` (DESC sütunlar `NULLS FIRST`, `ORDER BY ... DESC` ilə tam üst-üstə düşür) və `ratings` PK-sı kifayət edir.
- `castVote` aqreqatı 2 000 səsli zavodda 0.4 ms-dir (PK indeksi ilə); zavod sətri kilidi tranzaksiyanı sıralayır, ölçü problemi yoxdur.
- Proxy-nin redirect xəritəsi 5 000 sətirdə 0.4 ms SQL ilə yüklənir; yalnız teq dəyişəndə yenidən yüklənir.
- Yenidən yaratmaq: `npm run db:seed-load` (20 000 zavod, ~1 dəqiqə), sonra `npm run perf:factory`.
