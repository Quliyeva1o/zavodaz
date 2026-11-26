import { test } from "node:test";
import assert from "node:assert/strict";
import { FIGMA_CARDS, FIGMA_PHOTOS, assertLocalDb, figmaFixtureRows } from "../../scripts/seed/figma-fixture-data.ts";
import { PAGE_SIZE } from "../../src/features/catalog/types.ts";

// Default sıra (catalog-sql.ts): tariff_rank desc, verified desc, created_at desc.
const byDefault = <T extends { tariffRank: number; verified: boolean; createdAt: Date }>(rows: T[]) =>
  [...rows].sort((a, b) => b.tariffRank - a.tariffRank || Number(b.verified) - Number(a.verified) || b.createdAt.getTime() - a.createdAt.getTime());
const pages = (n: number) => Math.ceil(n / PAGE_SIZE);

test("figma fixture: kataloqun 1-ci səhifəsi Figma 281:7097-dəki 15 kartdır, Figma sırası ilə", () => {
  const rows = figmaFixtureRows();
  const first = byDefault(rows).slice(0, PAGE_SIZE);
  assert.deepEqual(first.map((r) => r.type), FIGMA_CARDS.map((c) => c.type));
  assert.deepEqual(first.map((r) => r.photo), FIGMA_CARDS.map((c) => c.photo));
  assert.ok(first.every((r) => r.verified && r.tariffCode === "vip" && r.ratingAvg === 3.5 && r.name === "Lorem ipsum dolor"));
});

test("figma fixture: kataloq, tövsiyə edilənlər və Zavodlar 10 səhifədir (1 2 3 … 10)", () => {
  const rows = [...figmaFixtureRows(), ...AGRO_FACTORIES];
  assert.equal(pages(rows.length), 10);
  assert.equal(pages(rows.filter((r) => r.tariffRank > 0).length), 10);
  assert.equal(pages(rows.filter((r) => r.type === "zavod").length), 10);
});

test("figma fixture: Zavodlar 1-ci səhifəsi 15 eyni Figma zavod kartıdır (299:7696)", () => {
  const zavod = byDefault(figmaFixtureRows().filter((r) => r.type === "zavod")).slice(0, PAGE_SIZE);
  assert.equal(zavod.length, PAGE_SIZE);
  assert.ok(zavod.every((r) => r.verified && r.tariffCode === "vip" && r.photo === "951922e99f1096917b71234fb3ded608b1e6ad8f"));
});

test("figma fixture: slug-lar unikaldır və figma- prefikslidir; şəkillər 6 fərqli Figma fill-idir", () => {
  const slugs = figmaFixtureRows().map((r) => r.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.ok(slugs.every((s) => /^figma-\d{3}$/.test(s)));
  assert.equal(FIGMA_PHOTOS.length, 6);
});

test("assertLocalDb: yalnız localhost / 127.0.0.1, mesajda sirr yoxdur", () => {
  assert.doesNotThrow(() => assertLocalDb("postgres://u:p@localhost:5442/zavod", {}));
  assert.doesNotThrow(() => assertLocalDb("postgres://u:p@127.0.0.1:5442/zavod", { NODE_ENV: "development" }));
  for (const url of ["postgres://u:topsecret@db.example.com:5432/zavod", "postgres://u:p@localhost.evil.com/zavod", "", "x"]) {
    assert.throws(() => assertLocalDb(url, {}), (e: Error) => /yalnız lokal bazada/.test(e.message) && !/topsecret/.test(e.message), url);
  }
});

test("assertLocalDb: cPanel prod-u da @localhost-dur — NODE_ENV=production və ya dev adı olmayan baza rədd olunur", () => {
  const prodLike = "postgres://cpuser_zavod:topsecret@localhost:5432/cpuser_zavod";
  assert.throws(() => assertLocalDb(prodLike, { NODE_ENV: "production" }), (e: Error) => /lokal bazada/.test(e.message) && !/topsecret/.test(e.message));
  // NODE_ENV qoyulmasa belə, baza adı 'zavod' deyil → rədd
  assert.throws(() => assertLocalDb(prodLike, {}), (e: Error) => /baza adı/.test(e.message) && !/topsecret/.test(e.message));
  // dev adı 'zavod' olan baza belə NODE_ENV=production ilə rədd olunur
  assert.throws(() => assertLocalDb("postgres://u:p@localhost:5432/zavod", { NODE_ENV: "production", FIGMA_FIXTURE_DB_OK: "1" }), /NODE_ENV=production/);
  // açıq razılıq başqa adlı lokal baza üçün işləyir, ancaq prod-da yox
  assert.doesNotThrow(() => assertLocalDb(prodLike, { FIGMA_FIXTURE_DB_OK: "1" }));
  assert.throws(() => assertLocalDb(prodLike, { FIGMA_FIXTURE_DB_OK: "0" }), /baza adı/);
});

// ---- Zavod səhifəsi fixture-u (Tapşırıq 6b): "Agro Trade Supply", Figma 312:11599 və tabları ----
import {
  AGRO,
  AGRO_FACTORIES,
  AGRO_PRODUCT_CODE,
  agroProducts,
  agroVacancies,
  CERTIFICATES,
  GALLERY_ABOUT,
  GALLERY_MEDIA,
} from "../../scripts/seed/figma-factory-data.ts";
import { PRODUCTS_PAGE_SIZE, SIMILAR_PRODUCTS, VACANCIES_PAGE_SIZE } from "../../src/features/factory/types.ts";

test("agro fixture: slug-lar figma- prefiksli və sabitdir (köhnə fixture təmizləməsi onları da silir)", () => {
  assert.deepEqual(
    AGRO_FACTORIES.map((f) => f.slug),
    ["figma-agro-trade-supply", "figma-agro-trade-supply-media"],
  );
  assert.ok(AGRO_FACTORIES.every((f) => f.slug.startsWith("figma-") && f.status === "published" && f.tariffRank === 0));
  assert.equal(AGRO.name, "Agro Trade Supply");
  assert.equal(AGRO.legalName, "Agro Trade Supply MMC");
  assert.equal(AGRO.ratingAvg, 3.5);
});

test("agro fixture: kataloq, tövsiyə edilənlər və Zavodlar yenə 10 səhifədir (agro zavodları ilə birlikdə)", () => {
  const rows = [...figmaFixtureRows(), ...AGRO_FACTORIES];
  assert.equal(pages(rows.length), 10);
  assert.equal(pages(rows.filter((r) => r.tariffRank > 0).length), 10);
  assert.equal(pages(rows.filter((r) => r.type === "zavod").length), 10);
  // Agro zavodları standart tarifdədir: kataloqun 1-ci səhifəsinə düşmür
  assert.ok(byDefault(rows).slice(0, PAGE_SIZE).every((r) => /^figma-\d{3}$/.test(r.slug)));
});

test("agro fixture: qalereyalar Figma sırası ilədir (Haqqında 312:11599 / Media 368:12413)", () => {
  assert.equal(GALLERY_ABOUT.length, 6);
  assert.equal(GALLERY_MEDIA.length, 6);
  assert.equal(GALLERY_ABOUT[0], "f0f28082c30df5a5ded42b748a44afead0f44751");
  assert.equal(GALLERY_MEDIA[0], "62fcfd5a8c1efecff83606df295b9fc97028b6de");
  assert.equal(CERTIFICATES.length, 8);
});

test("agro fixture: Məhsullar tabı — 1-ci səhifə 12 Figma kartı, cəmi 10 səhifə (1 2 3 … 10)", () => {
  const list = agroProducts();
  const newest = [...list].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  assert.equal(pages10(list.length), 10);
  const first = newest.slice(0, PRODUCTS_PAGE_SIZE);
  assert.ok(first.every((p) => p.name === "Məhsulun adı" && p.description === "Lorem ipsum dolor" && p.images.length === 1));
  // Məhsul səhifəsinin məhsulu (Figma 382:11083, kod 1519494) 1-ci səhifədə deyil, oxşarlar 6 Figma kartıdır
  const page = list.find((p) => p.id === AGRO_PRODUCT_CODE)!;
  assert.ok(page && !first.includes(page));
  assert.equal(page.images.length, 6);
  assert.ok(page.description.startsWith("Sed ut perspiciatis"));
  assert.ok(newest.filter((p) => p !== page).slice(0, SIMILAR_PRODUCTS).every((p) => p.description === "Lorem ipsum dolor"));
  assert.equal(new Set(list.map((p) => p.slug)).size, 1);
});

test("agro fixture: vakansiyalar 8-dən çoxdur (\"Daha çox göstər\" görünür), slug-lar unikal və figma- prefiksli", () => {
  const list = agroVacancies();
  assert.ok(list.length > VACANCIES_PAGE_SIZE);
  assert.equal(new Set(list.map((v) => v.slug)).size, list.length);
  assert.ok(list.every((v) => v.slug.startsWith("figma-") && v.title === "Middle UX/UI Designer" && v.salary === 1200));
});

const pages10 = (n: number) => Math.ceil(n / PRODUCTS_PAGE_SIZE);
