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
