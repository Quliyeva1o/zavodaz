import { test } from "node:test";
import assert from "node:assert/strict";
import { pageItems } from "../../src/components/catalog/pagination-items.ts";

test("pageItems: Figma '1 2 3 … 10' naxışı", () => {
  assert.deepEqual(pageItems(1, 10), [1, 2, 3, "gap", 10]);
  assert.deepEqual(pageItems(5, 10), [1, "gap", 4, 5, 6, "gap", 10]);
  assert.deepEqual(pageItems(10, 10), [1, "gap", 8, 9, 10]);
  assert.deepEqual(pageItems(1, 3), [1, 2, 3]);
});

test("pageItems: kənar hallar", () => {
  assert.deepEqual(pageItems(1, 1), [1]);
  assert.deepEqual(pageItems(2, 4), [1, 2, 3, 4]);
  assert.deepEqual(pageItems(3, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(pageItems(2, 10), [1, 2, 3, "gap", 10]);
  assert.deepEqual(pageItems(9, 10), [1, "gap", 8, 9, 10]);
  assert.deepEqual(pageItems(4, 10), [1, 2, 3, 4, 5, "gap", 10]);
});
