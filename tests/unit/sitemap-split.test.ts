import { test } from "node:test";
import assert from "node:assert/strict";
import { filesFor, PRODUCT_ID_START, productFilesFor, productRange, SITEMAP_ENTITIES_PER_FILE } from "../../src/features/factory/sitemap-sql.ts";

test("a file holds at most 50 000 URLs (3 languages per entity)", () => {
  assert.ok(SITEMAP_ENTITIES_PER_FILE * 3 <= 50_000);
  assert.ok((SITEMAP_ENTITIES_PER_FILE + 1) * 3 > 50_000, "the file is as full as it can be");
});

test("filesFor: at least one file, then one more for every started block", () => {
  assert.equal(filesFor(0), 1);
  assert.equal(filesFor(1), 1);
  assert.equal(filesFor(SITEMAP_ENTITIES_PER_FILE), 1);
  assert.equal(filesFor(SITEMAP_ENTITIES_PER_FILE + 1), 2);
  assert.equal(filesFor(SITEMAP_ENTITIES_PER_FILE * 3), 3);
});

test("product id ranges: contiguous, never wider than one file's worth of ids, so never over 50 000 URLs", () => {
  assert.deepEqual(productRange(0), { from: PRODUCT_ID_START, to: PRODUCT_ID_START + SITEMAP_ENTITIES_PER_FILE });
  for (const n of [0, 1, 7]) {
    const r = productRange(n);
    assert.equal(r.to - r.from, SITEMAP_ENTITIES_PER_FILE);
    assert.equal(productRange(n + 1).from, r.to);
    assert.ok((r.to - r.from) * 3 <= 50_000);
  }
});

test("productFilesFor: one file with no products; a new file starts at the first id past the range", () => {
  assert.equal(productFilesFor(null), 1);
  assert.equal(productFilesFor(PRODUCT_ID_START), 1);
  assert.equal(productFilesFor(PRODUCT_ID_START + SITEMAP_ENTITIES_PER_FILE - 1), 1);
  assert.equal(productFilesFor(PRODUCT_ID_START + SITEMAP_ENTITIES_PER_FILE), 2);
  assert.equal(productFilesFor(PRODUCT_ID_START + 1_000_000), Math.floor(1_000_000 / SITEMAP_ENTITIES_PER_FILE) + 1);
  // Every id up to the maximum falls inside one of the files.
  const max = PRODUCT_ID_START + 123_456;
  assert.ok(productRange(productFilesFor(max) - 1).to > max);
});
