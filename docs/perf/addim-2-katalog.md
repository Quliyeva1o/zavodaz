# Kataloq sorğularının performansı (Addım 2, Tapşırıq 11)

## Mühit və üsul

- Mühit: Windows 11, 12 məntiqi nüvə, Docker-də PostgreSQL 13.23 (`localhost:5442`), ayrıca `zavod_load` bazası. Dev bazası (`zavod`) toxunulmazdır.
- Məlumat: 20 000 zavod (`npm run db:seed-load -- --count 20000`, `mulberry32(42)`): 5% VIP, 10% Premium, 60% təsdiqlənmiş, 85% `published`, 0–3 model, 0–2 əməkdaşlıq, reytinq 0–5, `createdAt` son 3 ilə yayılıb, cover yoxdur (`media` boşdur). Seed sonunda `vacuum analyze`.
- Ölçmə: `npm run perf:catalog`. Skript tətbiqin real funksiyalarını (`buildCatalogQuery`, `buildLandingCounts`, `resolveCatalogIds` — `src/features/catalog/catalog-sql.ts`) işlədir, drizzle-in göndərdiyi SQL-i və parametrləri tutur və eyni ifadəni `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` ilə 5 dəfə icra edir. Cache yoxdur. Hədəf: hər ifadə ≤ 50 ms.
- "Divar" sütunu: funksiyanın bütöv vaxtı (siyahı + say sorğusu paralel, bağlantı gediş-gəlişi daxil). "SQL" sütunları: PostgreSQL-in `Execution Time` dəyəri (ilk / median, 5 icra).

## Nəticələr (indeks düzəlişindən sonra)

| Sorğu | Divar ilk / median, ms | SQL: siyahı (ilk / median, ms) | SQL: say (ilk / median, ms) | İndekslər |
|---|---|---|---|---|
| default, səhifə 1 | 33.7 / 8.3 | 0.10 / 0.10 | 2.53 / 2.51 | `factories_pub_default_idx`; say: index-only `factories_pub_rating_asc_idx` |
| default, səhifə 50 | 7.0 / 6.5 | 0.84 / 0.83 | 2.35 / 2.35 | `factories_pub_default_idx`; say: index-only |
| tip (fabrik) | 6.1 / 6.1 | 0.22 / 0.16 | 0.85 / 0.48 | `factories_pub_type_idx` |
| tip + şəhər | 11.0 / 7.5 | 0.54 / 0.54 | 0.42 / 0.44 | `factories_city_idx` + `factories_pub_type_idx` |
| model (`@>`) | 9.2 / 9.2 | 0.16 / 0.16 | 2.66 / 2.66 | siyahı: `factories_pub_default_idx` (sıralı skan + filtr); say: `factories_models_gin` |
| əməkdaşlıq (coop) | 18.8 / 11.8 | 0.18 / 0.17 | 6.03 / 3.13 | siyahı: `factories_pub_default_idx`; say: `factories_coop_gin` |
| rating_desc | 5.8 / 6.5 | 0.10 / 0.12 | 3.16 / 3.08 | `factories_pub_rating_desc_idx` |
| rating_asc | 8.2 / 7.2 | 0.12 / 0.12 | 2.73 / 2.49 | `factories_pub_rating_asc_idx` |
| tövsiyə edilənlər | 7.3 / 6.2 | 0.12 / 0.11 | 0.44 / 0.47 | `factories_pub_default_idx` |
| landing (tip + sahə) | 5.4 / 5.4 | 0.21 / 0.23 | 1.15 / 1.12 | `factories_pub_type_idx`, `factories_industry_idx` |
| landing sayları (2 qrup sorğusu) | 29.3 / 17.6 | — | — | tam cədvəl aqreqatı: seq scan, 8.4 / 8.3 və 9.4 / 8.3 ms |

Bütün ifadələr ≤ 50 ms-dir (ən yavaşı landing sayları, ~9 ms SQL). `media` cədvəli boş olduğundan planlarda onun üzərində seq scan görünə bilər; real məlumatda cover join-i `media_pkey` ilə gedir.

## Tapılan və düzəldilən problem

İlk ölçmədə (düzəlişdən əvvəl) bütün siyahı sorğuları 5–12 ms idi (hədəf daxilində), amma `factories_pub_default_idx` heç istifadə olunmurdu: default, model, coop sorğuları bütün `published` sətirləri seq scan ilə oxuyub top-N sort edirdi (default səhifə 1: 7.6 ms, səhifə 50: 12 ms). Səbəb: drizzle indeksdə `.desc()` üçün `DESC NULLS LAST` yazır, `ORDER BY ... DESC` isə PostgreSQL-də `NULLS FIRST` deməkdir. Sütunlar `NOT NULL` olsa da planlaşdırıcı bu indeksi sıralama üçün uyğun saymır. Plan 2-ci tapşırığın hesabatındakı "NOT NULL olduğu üçün mane olmur" fərziyyəsi yanlış idi (mane olur).

Miqrasiya `drizzle/0003_curved_rafael_vega.sql`:

- `factories_pub_default_idx` və `factories_pub_type_idx` DESC sütunları `NULLS FIRST` ilə yenidən yaradıldı;
- köhnə `factories_pub_rating_idx (rating_avg, rating_count)` iki indekslə əvəz olundu, hər biri `ORDER BY` ilə tam üst-üstə düşür: `factories_pub_rating_desc_idx (rating_avg DESC, rating_count DESC, id DESC)` və `factories_pub_rating_asc_idx (rating_avg ASC, rating_count DESC, id DESC)`.

Əvvəl: default siyahı 7.6 ms (seq scan + sort), səhifə 50 12.1 ms, model 7.5 ms, coop 5.6 ms. Sonra: 0.10 / 0.83 / 0.16 / 0.17 ms. 20 000 sətirdə hər ikisi hədəfdən aşağı idi, amma seq scan + sort xətti artır; indeks isə səhifə dərinliyindən başqa ölçüdən asılı deyil.

`rating_asc` qeydi: Tapşırıq 5 rəyindəki indeks istiqaməti uyğunsuzluğu (tək `rating_avg, rating_count` indeksi `rating_count DESC, id DESC` ilə uyğun gəlmirdi) məhz bu iki indekslə həll olundu; indi `rating_asc` və `rating_desc` ayrı indeksdən birbaşa oxuyur (0.12 ms).

## Nəticə

- Bütün 12 tipik sorğu hədəfdən çox aşağıdır (SQL ≤ 9.4 ms, tətbiq vaxtı ≤ 34 ms ilk soyuq çağırışda, median ≤ 18 ms).
- Siyahı və say sorğularında `factories` üzərində seq scan yoxdur. Yeganə seq scan `landing sayları`ndadır: bütün `published` sətirlər üzrə qrup aqreqatıdır, seq scan düzgün plandır; nəticə cache-lidir (sitemap, `factories` teqi).
- Model və coop filtrləri siyahı üçün sıralı default indeksi gəzib filtrləyir (qəbul olunan seçimlərin ~15–35%-i uyğun gəlir, 15 sətir tez tapılır); say üçün GIN istifadə olunur. Çox nadir model/coop dəyərlərində planlaşdırıcı GIN-ə keçə bilər; nəticə hər halda sıralanmış 15 sətirlik limitdir.
- Count (`count(*)`) 85% seçiciliklə index-only scan-dır; `vacuum` olmasa seq scan-a düşür (prod-da autovacuum bunu edir).
- Təkrar: `npm run db:seed-load -- --count 20000 && npm run perf:catalog` (`LOAD_DATABASE_URL` `.env.local`-da, yalnız `zavod_load` icazəlidir).
