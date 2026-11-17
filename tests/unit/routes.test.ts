import { test } from "node:test";
import assert from "node:assert/strict";
import { locales } from "../../src/i18n/config.ts";
import {
  factoryHref,
  href,
  recommendedHref,
  resolvePublicPath,
  staticRoutes,
  switchLocalePath,
  typeHref,
  typeRoutes,
  type RouteKey,
} from "../../src/i18n/routes.ts";

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

test("factory type pages and landings", () => {
  assert.deepEqual(resolvePublicPath("/fabrikler"), { kind: "rewrite", internal: "/az/catalog/type/fabrik" });
  assert.deepEqual(resolvePublicPath("/fabrikler/baki"), { kind: "rewrite", internal: "/az/catalog/type/fabrik/baki" });
  assert.deepEqual(resolvePublicPath("/zavodlar/baki"), { kind: "rewrite", internal: "/az/catalog/type/zavod/baki" });
  assert.deepEqual(resolvePublicPath("/en/factories/qida-senayesi"), { kind: "rewrite", internal: "/en/catalog/type/fabrik/qida-senayesi" });
  assert.deepEqual(resolvePublicPath("/ru/fabriki"), { kind: "rewrite", internal: "/ru/catalog/type/fabrik" });
  assert.deepEqual(resolvePublicPath("/en/fabrikler"), { kind: "notFound", locale: "en" });
  assert.deepEqual(resolvePublicPath("/fabrikler/baki/x"), { kind: "notFound", locale: "az" });
});

test("recommended sub-page is translated", () => {
  assert.deepEqual(resolvePublicPath("/kataloq/tovsiyye-edilenler"), { kind: "rewrite", internal: "/az/catalog/recommended" });
  assert.deepEqual(resolvePublicPath("/en/catalog/recommended"), { kind: "rewrite", internal: "/en/catalog/recommended" });
  assert.deepEqual(resolvePublicPath("/ru/katalog/rekomenduemye"), { kind: "rewrite", internal: "/ru/catalog/recommended" });
  assert.deepEqual(resolvePublicPath("/kataloq/recommended"), { kind: "notFound", locale: "az" });
  assert.deepEqual(resolvePublicPath("/kataloq/x"), { kind: "notFound", locale: "az" });
});

test("hrefs and language switch", () => {
  assert.equal(typeHref("sex", "az"), "/sexler");
  assert.equal(typeHref("aqropark", "en", "baki"), "/en/agroparks/baki");
  assert.equal(recommendedHref("en"), "/en/catalog/recommended");
  assert.equal(factoryHref("agro-trade", "ru"), "/ru/fabrika/agro-trade");
  assert.equal(switchLocalePath("/zavodlar/baki", "en"), "/en/plants/baki");
  assert.equal(switchLocalePath("/fabrikler", "ru"), "/ru/fabriki");
  assert.equal(switchLocalePath("/kataloq/tovsiyye-edilenler", "ru"), "/ru/katalog/rekomenduemye");
  assert.equal(switchLocalePath("/fabrik/agro-trade", "en"), "/en/factory/agro-trade");
});

test("factory page resolves per language", () => {
  assert.deepEqual(resolvePublicPath("/en/factory/agro-trade"), { kind: "rewrite", internal: "/en/factory/agro-trade" });
  assert.deepEqual(resolvePublicPath("/en/fabrik/agro-trade"), { kind: "notFound", locale: "en" });
});

test("type segments are unique and do not clash with static routes", () => {
  for (const l of locales) {
    const statics = (Object.keys(staticRoutes) as RouteKey[]).map((k) => staticRoutes[k][l]).filter(Boolean);
    const types = Object.values(typeRoutes).map((r) => r[l]);
    assert.equal(new Set([...statics, ...types]).size, statics.length + types.length, `clash in ${l}`);
  }
});
