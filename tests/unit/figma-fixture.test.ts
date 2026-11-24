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
  const rows = figmaFixtureRows();
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
