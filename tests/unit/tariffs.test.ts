import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPrice } from "../../src/features/tariffs/format.ts";

test("formatPrice writes AZN like Figma", () => {
  assert.equal(formatPrice(799), "7.99₼");
  assert.equal(formatPrice(999), "9.99₼");
  assert.equal(formatPrice(8600), "86₼");
  assert.equal(formatPrice(8650), "86.50₼");
  assert.equal(formatPrice(0), "0₼");
});
