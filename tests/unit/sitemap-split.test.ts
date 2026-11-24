import { test } from "node:test";
import assert from "node:assert/strict";
import { filesFor, SITEMAP_ENTITIES_PER_FILE } from "../../src/features/factory/sitemap-sql.ts";

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
