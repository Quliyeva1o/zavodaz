import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalProductPath, parseProductPath } from "../../src/features/factory/product-path.ts";

test("parseProductPath reads the internal product route only", () => {
  assert.deepEqual(parseProductPath("/az/factory/agro/products/1519494-sud"), { lang: "az", factorySlug: "agro", key: "1519494-sud", code: 1519494 });
  assert.equal(parseProductPath("/ru/factory/agro/products/1519494")?.code, 1519494);
  assert.equal(parseProductPath("/az/factory/agro/products"), null);
  assert.equal(parseProductPath("/az/factory/agro/media"), null);
  assert.equal(parseProductPath("/az/factory/agro/products/abc"), null);
  assert.equal(parseProductPath("/xx/factory/agro/products/1519494-sud"), null);
  assert.equal(parseProductPath("/az/catalog/agro/products/1519494-sud"), null);
});

test("canonicalProductPath: null when the URL is already canonical, else the public URL in the page language", () => {
  const p = parseProductPath("/az/factory/agro/products/1519494-kohne")!;
  assert.equal(canonicalProductPath(p, "sud"), "/fabrik/agro/mehsullar/1519494-sud");
  assert.equal(canonicalProductPath(parseProductPath("/az/factory/agro/products/1519494-sud")!, "sud"), null);
  assert.equal(canonicalProductPath(parseProductPath("/en/factory/agro/products/1519494")!, "sud"), "/en/factory/agro/products/1519494-sud");
  assert.equal(canonicalProductPath(parseProductPath("/ru/factory/agro/products/1519494-x")!, "sud"), "/ru/fabrika/agro/produkciya/1519494-sud");
});
