import { test } from "node:test";
import assert from "node:assert/strict";
import { pageSeoTitle } from "../../src/features/pages/seo-title.ts";

const loc = (az: string, en = "", ru = "") => ({ az, en, ru });

test("SEO title of the requested language wins", () => {
  const p = { title: loc("Tariflər", "Pricing"), seo: { title: loc("Tariflər | Zavod.az", "Pricing plans | Zavod.az"), description: loc("") } };
  assert.equal(pageSeoTitle(p, "en"), "Pricing plans | Zavod.az");
  assert.equal(pageSeoTitle(p, "az"), "Tariflər | Zavod.az");
});

test("empty SEO title uses the page title in the same language before the AZ SEO title", () => {
  const p = { title: loc("Tariflər", "Pricing"), seo: { title: loc("Tariflər | Zavod.az"), description: loc("") } };
  assert.equal(pageSeoTitle(p, "en"), "Pricing | Zavod.az");
});

test("without a title in that language it falls back to the AZ SEO title", () => {
  const p = { title: loc("Tariflər"), seo: { title: loc("Tariflər — paketlər | Zavod.az"), description: loc("") } };
  assert.equal(pageSeoTitle(p, "ru"), "Tariflər — paketlər | Zavod.az");
});

test("with no SEO title at all it builds one from the AZ page title", () => {
  const p = { title: loc("Tariflər"), seo: { title: loc(""), description: loc("") } };
  assert.equal(pageSeoTitle(p, "ru"), "Tariflər | Zavod.az");
});
