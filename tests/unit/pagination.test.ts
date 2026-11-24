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

test("pageItems compact (mobil, Figma 736:24508 '1 2 … 10'): 288-ə sığır — ox düymələri ilə ən çox 7 xana", () => {
  assert.deepEqual(pageItems(1, 10, true), [1, 2, "gap", 10]);
  assert.deepEqual(pageItems(2, 10, true), [1, 2, "gap", 10]);
  assert.deepEqual(pageItems(3, 10, true), [1, 2, 3, "gap", 10]);
  assert.deepEqual(pageItems(5, 10, true), [1, "gap", 5, "gap", 10]);
  assert.deepEqual(pageItems(10, 10, true), [1, "gap", 9, 10]);
  assert.deepEqual(pageItems(1, 3, true), [1, 2, 3]);
  assert.deepEqual(pageItems(1, 1, true), [1]);
  for (let count = 1; count <= 30; count++)
    for (let cur = 1; cur <= count; cur++) assert.ok(pageItems(cur, count, true).length + 2 <= 7, `${cur}/${count}`);
});
