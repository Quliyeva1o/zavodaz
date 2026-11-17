import assert from "node:assert/strict";
import { test } from "node:test";
import { isIgnored, isMultiParagraph, minTextsError, normalizeText, pickMatch, resolveText } from "../visual/geometry-lib.mjs";

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

test("Figma yumşaq sətir keçidləri (U+2028/U+2029) çoxparaqraf sayılır və boşluq kimi normallaşır", () => {
  assert.equal(isMultiParagraph("bir iki"), true);
  assert.equal(isMultiParagraph("bir iki"), true);
  assert.equal(normalizeText("bir iki  üç"), "bir iki üç");
});

test("isIgnored: ignore siyahısı normallaşdırılmış mətnlə müqayisə olunur", () => {
  assert.equal(isIgnored("Type  here...\n", ["Type here..."]), true);
  assert.equal(isIgnored("Adınız", ["Type here..."]), false);
  assert.equal(isIgnored("Adınız", undefined), false);
});

test("pickMatch: eyni mətnli istifadə olunmamış qutulardan ən yaxını seçilir", () => {
  const site = [
    { text: "E-mail", x: 775, y: 218 },
    { text: "E-mail", x: 90, y: 309 },
    { text: "Ad", x: 0, y: 0 },
  ];
  assert.equal(pickMatch({ x: 90, y: 309 }, site, new Set(), "E-mail"), 1);
  assert.equal(pickMatch({ x: 90, y: 309 }, site, new Set([1]), "E-mail"), 0);
  assert.equal(pickMatch({ x: 0, y: 0 }, site, new Set(), "Yox"), -1);
});
