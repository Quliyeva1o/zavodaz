import { test } from "node:test";
import assert from "node:assert/strict";
import { starFills } from "../../src/components/catalog/star-fills.ts";

test("starFills: Figma kartı 3.5", () => {
  assert.deepEqual(starFills(3.5), ["full", "full", "full", "half", "empty"]);
});

test("starFills: 0.25-ə yuvarlaqlaşdırma", () => {
  assert.deepEqual(starFills(0), ["empty", "empty", "empty", "empty", "empty"]);
  assert.deepEqual(starFills(5), ["full", "full", "full", "full", "full"]);
  assert.deepEqual(starFills(4.24), ["full", "full", "full", "full", "empty"]);
  assert.deepEqual(starFills(4.25), ["full", "full", "full", "full", "half"]);
  assert.deepEqual(starFills(4.74), ["full", "full", "full", "full", "half"]);
  assert.deepEqual(starFills(4.75), ["full", "full", "full", "full", "full"]);
});

test("starFills: sərhəddən kənar dəyərlər", () => {
  assert.deepEqual(starFills(-1), ["empty", "empty", "empty", "empty", "empty"]);
  assert.deepEqual(starFills(9), ["full", "full", "full", "full", "full"]);
  assert.deepEqual(starFills(Number.NaN), ["empty", "empty", "empty", "empty", "empty"]);
});
