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

test("resolveMatcher: alias, pattern və adi mətn", async () => {
  const { resolveMatcher } = await import("../visual/geometry-lib.mjs");
  const plain = resolveMatcher("Salam\n", {}, {});
  assert.equal(plain.text, "Salam");
  assert.equal(plain.kind, "text");
  assert.equal(plain.test("Salam"), true);
  assert.equal(plain.test("Sağol"), false);
  const alias = resolveMatcher("Movzu", { Movzu: "Mövzu" }, {});
  assert.equal(alias.kind, "alias");
  assert.equal(alias.test("Mövzu"), true);
  const pat = resolveMatcher("1519494", {}, { "1519494": "^1\\d{6}$" });
  assert.equal(pat.kind, "pattern");
  assert.equal(pat.test("1000123"), true);
  assert.equal(pat.test("1000123 x"), false);
  assert.equal(pat.test("999"), false);
});

test("pickMatch: funksiya ilə axtarış (pattern)", async () => {
  const site = [
    { text: "1000001", x: 0, y: 0 },
    { text: "1000002", x: 300, y: 0 },
    { text: "Ad", x: 300, y: 10 },
  ];
  const isCode = (s: string) => /^1\d{6}$/.test(s);
  assert.equal(pickMatch({ x: 306, y: 0 }, site, new Set(), isCode), 1);
  assert.equal(pickMatch({ x: 306, y: 0 }, site, new Set([1]), isCode), 0);
});

test("unionRoot: bir neçə node sintetik kökdə, qutu birləşməsi ilə", async () => {
  const { unionRoot } = await import("../visual/geometry-lib.mjs");
  const a = { id: "1:1", type: "FRAME", absoluteBoundingBox: { x: 0, y: 473, width: 893, height: 104 }, children: [] };
  const b = { id: "1:2", type: "FRAME", absoluteBoundingBox: { x: 0, y: 601, width: 893, height: 1402 }, children: [] };
  assert.equal(unionRoot([a]), a);
  const r = unionRoot([a, b]);
  assert.deepEqual(r.absoluteBoundingBox, { x: 0, y: 473, width: 893, height: 1530 });
  assert.deepEqual(r.children.map((c: { id: string }) => c.id), ["1:1", "1:2"]);
});
