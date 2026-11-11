# Zavod.az — Figma analizi (inventar)

> Mənbə: Figma API, fayl **Zavod.az** (`iLz9wZPvZmcyxEWRKjMY4m`), son dəyişiklik 2026-11-11.
> Bu sənəd yalnız faktları toplayır (Figma-da nə var). Qərarlar ayrıca spec sənədində olacaq.

## 1. Faylın quruluşu

- Figma-da bir səhifə var ("Link Button"), içində 7 bölmə (Section) və dizayn-sistem frame-ləri var.
- **Breakpoint-lər:** Desktop **1440** (86 ekran) və Mobile **320** (78 ekran). **Tablet dizaynı yoxdur.**
- Prototip keçidləri var (~4900 node-da interaction).

| Bölmə | Desktop ekranlar |
|---|---|
| Əsas səhifələr | Ana səhifə, Xəbərlər, Xəbər daxili, Tariflər, Əlaqə, Yardım (FAQ), İstifadəçi qaydaları, Məxfilik siyasəti, Mob/Menu |
| Axtarış | Axtarış (yazılan hal), nəticələr 7 tabda (Zavodlar, Fabriklər, Sexlər, Emalatxanalar, Kombinatlar, Aqroparklar, Xəbərlər), "nəticə tapılmadı" |
| Vakansiyalar | Siyahı, Vakansiya daxili, Müraciət modalı (boş / CV yüklənib / Uğurlu) |
| Daxil ol / Qeydiyyat | Daxil ol, Qeydiyyata müraciət (2 addım), İlk dəfə daxil ol, Şifrəni unutdum (email), Kod (4 rəqəm), Yeni şifrə |
| Profilin qurulması | Qeydiyyatdan sonra anket (boş / doldurulmuş) |
| İstifadəçi profili / Dashboard | Şəxsi kabinet + 9 media halı, Tənzimləmələr (profil, xəbər bülleteni), Statistika, Tariflər, Aktiv tarif, Ödəniş modalı, Məhsullar (CRUD + limit), Vakansiyalar (CRUD + müraciətlər + limit), silmə modalları |
| Kataloq | Kataloq + Filtr, Tövsiyə edilənlər, 6 tip üzrə siyahı, Zavod daxili səhifə (5 tab), Qiymətləndir (3 hal), Məhsul daxili |

## 2. Dizayn sistemi

- **Şrift:** yalnız **Inter** (400 / 500 / 600). Text style-lar: H1–H5, Subtitle 1–3, Body Large/Medium/Small, Caption, Overline, Mob/H1, Mob/H2, Mob/Subtitle.
- **Rəng palitrası (4 şkala, 50→950):**
  - Boz (Santas Gray): `#F7F7F8 #EDEDF1 #D8D9DF #B5B7C4 #8D91A3 #6F7388 #595C70 #494C5B #3D3F4B #373843 #25252C`
  - Göy-tünd (əsas brend): `#F5F6FA #EBECF3 #D2D5E5 #ABB3CE #7D89B3 #5D6B9A #495380 #3C4368 #343A58 #2F344B #1A1C29`
  - Qırmızı (xəta/silmə): `#FCF4F4 … #9D3838 … #311111`
  - Yaşıl (uğur/"Təsdiqlənib"): `#F1F8F3 … #47825E … #101E17`, əlavə `#5ECA83`
  - Ulduz (reytinq): `#F2CC50`
- **Komponentlər:** Footer, Pop up (Default / CV uploaded), Cell (Default/Active), Dashboard sol menyu, Mob tip ikonları (6 tip), Mob/Vakansiya kartı, Search tab, Buttons (2 frame), Icons (2 frame), Logo.

## 3. Ümumi (global) hissələr

- **Header:** telefon, "Birbaşa WhatsApp-a yazın", dil seçici (Az/En/Ru), "Daxil ol"; menyu: Ana səhifə, Xəbərlər, Kataloq, Tariflər, Vakansiyalar, Əlaqə.
- **Mobil menyu:** eyni linklər + dil seçimi + telefon + WhatsApp.
- **Footer:** loqo, linklər (Ana səhifə, Xəbərlər, Kataloq, **Xidmətlər**, Vakansiyalar, Əlaqə), sosial şəbəkələr (FB, IG, LinkedIn, X, YouTube, TikTok), ünvan, telefon, İstifadəçi qaydaları / Yardım / Məxfilik siyasəti, ©.
- **Reklam bannerləri:** "PARTNER.AZ — Biznes sat və al" geniş banner (səhifə altı) və sağ sütunda vertikal banner (zavod səhifəsi). Ana səhifədə 240px-lik 3 banner yeri.
- **Breadcrumb** bütün daxili səhifələrdə.

## 4. Səhifələr və funksionallıq

### 4.1 Ana səhifə (yuxarıdan aşağı)
1. Hero: 6 tip kartı (Zavodlar, Sexlər, Kombinatlar, Fabriklər, Emalatxanalar, Aqroparklar) + "Azərbaycanın sənaye platforması" + axtarış (input + Axtar).
2. Xəbərlər (1 böyük + kiçiklər, "Hamısına bax").
3. Tövsiyə edilənlər (zavod kartları).
4. Banner yeri.
5. Zavodlar → 6. Fabriklər → banner → Sexlər → Emalatxanalar → banner → Kombinatlar → Aqroparklar (hər biri karusel/kart sırası + "Hamısına bax").
7. Ödənişli tariflər (3 paket).
8. Əlaqə forması.
9. Banner, Footer.

**Zavod kartı:** şəkil, "Təsdiqlənib" nişanı, tip (ZAVOD/FABRİK…), ad, qısa təsvir, reytinq (ulduz), "Ətraflı".

### 4.2 Axtarış
- Hero-dakı input-a yazanda axtarış halı (mobildə "Agro Tra…" — autocomplete/canlı nəticə).
- Nəticə səhifəsi: `"Agro Trade" sözü üzrə axtarış nəticəsi`, 7 tab (6 tip + Xəbərlər), "Daha çox nəticəyə bax", boş nəticə halı.

### 4.3 Kataloq
- Filtr (sol): İstehsalın tipi (checkbox, 6 tip + Hamısı), İstehsal sahəsi (select), Şəhər/Region (select), Məhsul tipi (select), İstehsalat modeli (multi-select: İxrac yönümlü, Daxili bazara yönəlmiş, Xammal emalı müəssisəsi, Hazır məhsul istehsalçısı, OEM), Əməkdaşlıq imkanı (Distribyutor / Tərəfdaş / Satış təmsilçisi axtarır), Reytinqə görə sıralama, "Filtri sıfırla".
- Qrid (3 sütun) + səhifələmə (1 2 3 … 10).
- Ayrı görünüşlər: Tövsiyə edilənlər və 6 tip üzrə.

### 4.4 Zavod (müəssisə) daxili səhifəsi
- Cover şəkil, loqo, "Təsdiqlənib", ad, tip, reytinq (3.5 ★) + "Qiymətləndir".
- Sağ sütun: Əlaqə məlumatları (telefon, email, sayt, ünvan, sosial linklər) + banner.
- Tablar: **Haqqında** (mətn + 6 xüsusiyyət kartı + Media önizləmə), **Media** (video + şəkillər), **Məhsullar** (PDF kataloqlar + məhsul qridi + səhifələmə → məhsul daxili: qalereya, kod, ad, təsvir, "Oxşar məhsullar"), **Texniki imkanlar** (avadanlıq siyahısı + sertifikatlar), **Vakansiyalar**.
- **Qiymətləndir** modalı: ulduz seç → Təsdiqlə → Təşəkkür mesajı.

### 4.5 Vakansiyalar
- Siyahı: axtarış + filtr ("Change Label" select), "Ən son paylaşılan", kart (tarix, vəzifə, maaş ₼/Ay, şirkət), "Daha çox göstər".
- Daxili: Ümumi məlumat (Şəhər, Maaş, İş rejimi, Yerləşmə tarixi, Bitmə tarixi), Haqqında, şirkət kartı (telefon, email), "Müraciət et".
- Müraciət modalı: Ad, Soyad, Email, Nömrə, **CV (PDF)** drag & drop → "Qəbul olundu!".

### 4.6 Xəbərlər
- Siyahı + "Daha çox göstər"; daxili: başlıq, tarix, mətn + şəkillər, "Paylaş".

### 4.7 Statik / məlumat səhifələri
- Tariflər (3 paket), Əlaqə (forma: Ad, Soyad, Email, Nömrə, Mövzu select, Mesaj 0/200), Yardım (FAQ akkordeon), İstifadəçi qaydaları, Məxfilik siyasəti (tab keçidli rich text).

### 4.8 Daxil ol / Qeydiyyat axını
1. **Qeydiyyat üçün müraciət:** addım 1 — istehsalın tipi (Fabrik / Sex / Emalatxana); addım 2 — Zavodun adı, müraciət edən şəxsin adı, soyadı, telefon.
2. **İlk dəfə daxil ol:** istifadəçi adı + şifrə → "Şifrəni dəyiş və daxil ol" → yeni şifrə (≥ 8 simvol).
3. **Daxil ol:** istifadəçi adı + şifrə, "Şifrəni unutmuşam".
4. **Şifrə bərpası:** email → 4 rəqəmli kod → yeni şifrə.
5. **Profilin qurulması (anket):** Zavod haqqında (ad, haqqında 0/400, texniki avadanlıq siyahısı, istehsal tipi, əməkdaşlıq imkanı, istehsal sahəsi, məhsul tipi, istehsalat modeli, işçi sayı, istehsal gücü), Ümumi (şəhər/region, ünvan, telefon, email, sayt, YouTube), Şəkillər (max 6), Sosial media (6 şəbəkə).

### 4.9 Şəxsi kabinet (zavod hesabı)
- Sol menyu: Şəxsi kabinet, Məhsullar, Vakansiyalar, Tariflər, Statistika, Tənzimləmələr, Çıxış.
- **Şəxsi kabinet:** cover + avatar seç, redaktə / paylaş / sil ikonları; 4 blok: Şəkillər, Sertifikatlar (drag & drop), Reklam videosu (YouTube link), Fayllar (PDF, ad + fayl, "Digərini əlavə et"); "Premium tarifə qoşul" promo.
- **Məhsullar:** siyahı, yeni / redaktə (ad, təsvir 0/400, max 6 şəkil), sil modalı; **tarif limiti** (pulsuz: 1; Premium: 50; VIP: 200) → limit aşanda "Tarifinizi dəyişin" modalı.
- **Vakansiyalar:** siyahı, yeni / redaktə (başlıq, şəhər, maaş, valyuta, iş rejimi, bitmə tarixi, haqqında 0/700), sil; **Müraciətlər** cədvəli (ad, email, telefon, CV yüklə, seçib silmək, səhifələmə); limit (pulsuz 1, Premium 3, VIP limitsiz).
- **Tariflər:** aktiv tarif + bitmə tarixi; "İndi qoşul" → aylıq 7.99₼ / illik 86₼ (10% endirim) → **kart məlumatları formu** (kartın adı, nömrə, son tarix, CVV) → "Tarifə qoşul".
- **Statistika:** səhifə baxışları, sayta keçidlər, vakansiya müraciətləri, reytinq.
- **Tənzimləmələr:** profil formu (anketin eynisi) + **Fərdi URL** (`https://zavod.az/AgroTradeSupply`); **Xəbər bülleteni** — email bildiriş seçimləri (7 checkbox).
- "Profil" frame-indəki qeydlər: profili silmək, tarifi dayandırmaq imkanı da olmalıdır.

### 4.10 Tariflər (məzmun)
| | Standart | Premium | VİP |
|---|---|---|---|
| Qiymət | Pulsuz | 7.99₼/ay | 9.99₼/ay |
| Vakansiya | 1 | 3 | Limitsiz |
| Məhsul | 1 | 50 | 200 |
| Əlavə | Profil | SEO, 1 məqalə, "Tövsiyə edilənlər"də yer, podkast ildə 1 | Tam SEO + Google reklam, 3 məqalə, ana səhifədə banner, xəbərlərdə reportaj, podkast ildə 2 |

## 5. Figma-da OLMAYAN, amma lazım olan hissələr
- **Admin panel** (qeydiyyat müraciətlərini təsdiq, hesab yaratma, "Təsdiqlənib" nişanı, xəbərlər, bannerlər, tariflər, lüğətlər/filtr dəyərləri, əlaqə müraciətləri, statik səhifələr).
- 404 / 500 səhifələri.
- Email şablonları (kod, şifrə, müraciət bildirişləri, tarif bitməsi).
- Ödəniş provayderinin səhifəsi / callback halları (uğurlu / uğursuz).
- Tablet görünüşü (aralıq ölçülər fluid olacaq).

## 6. Dizaynda uyğunsuzluqlar (sual kimi qeyd olunub)
- Qeydiyyat addım 1-də yalnız 3 tip var (Fabrik / Sex / Emalatxana), saytda isə 6 tip.
- Footer-də "Xidmətlər" linki var, belə səhifə yoxdur; header-də isə "Tariflər".
- CV limiti "200MB" (çox güman ki, səhvdir).
- Premium vakansiya limiti: tarif kartında "3", kabinet mətnində "50".
- Kabinetdə ödəniş üçün kart formu öz saytımızda çəkilib — kart məlumatları bank səhifəsində daxil edilməlidir.
- Filtrdə placeholder dəyərlər ("Category 1..4", "Change Label").
