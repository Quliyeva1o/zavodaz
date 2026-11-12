import assert from "node:assert/strict";
import { test } from "node:test";
import { isMultiParagraph, minTextsError, normalizeText, resolveText } from "../visual/geometry-lib.mjs";

test("normalizeText: boşluqlar və sətir keçidləri tək boşluğa enir", () => {
  assert.equal(normalizeText("  a\n\n b \t c "), "a b c");
});

test("isMultiParagraph: yalnız daxili sətir keçidi", () => {
  assert.equal(isMultiParagraph("bir\niki"), true);
  assert.equal(isMultiParagraph("bir iki\n"), false);
});

test("resolveText: alias normallaşdırılmış açarla işləyir", () => {
  assert.deepEqual(resolveText("Fabrik.az  ilə", { "Fabrik.az ilə": "Zavod.az ilə" }), { text: "Zavod.az ilə", aliased: true });
  assert.deepEqual(resolveText("Salam\n", {}), { text: "Salam", aliased: false });
});

test("minTextsError: default 1, 0 açıq yazıla bilər", () => {
  assert.match(minTextsError(0, undefined) ?? "", /expected ≥ 1 Figma texts, got 0/);
  assert.equal(minTextsError(0, 0), null);
  assert.equal(minTextsError(5, 3), null);
  assert.match(minTextsError(2, 3) ?? "", /≥ 3.*got 2/);
});
