import assert from "node:assert/strict";
import { test } from "node:test";
import { cropHeight, cropImage, cropImageTop, openSteps, refOffset, runOpen, textsInCrop } from "../visual/target-lib.mjs";

test("openSteps: yoxdur → [], sətir → [sətir], massiv olduğu kimi", () => {
  assert.deepEqual(openSteps(undefined), []);
  assert.deepEqual(openSteps("button"), ["button"]);
  assert.deepEqual(openSteps(["a", "b"]), ["a", "b"]);
});

test("openSteps: boş massiv, boş sətir və sətir olmayan rədd olunur", () => {
  for (const bad of [[], "", "  ", ["a", ""], [1], 3, null]) assert.throws(() => openSteps(bad), /open:/, JSON.stringify(bad));
});

test("runOpen: addımlar ardıcıl, hər biri görünəndən sonra kliklənir", async () => {
  const log: string[] = [];
  const page = {
    locator: (s: string) => ({
      first: () => ({
        waitFor: async () => void log.push(`wait ${s}`),
        click: async () => void log.push(`click ${s}`),
      }),
    }),
  };
  await runOpen(page, ["#filter", "row"]);
  assert.deepEqual(log, ["wait #filter", "click #filter", "wait row", "click row"]);
  log.length = 0;
  await runOpen(page, undefined);
  assert.deepEqual(log, []);
});

test("cropHeight: müsbət tam ədəd və ya null", () => {
  assert.equal(cropHeight(undefined), null);
  assert.equal(cropHeight(422), 422);
  for (const bad of [0, -1, 1.5, "422"]) assert.throws(() => cropHeight(bad), /crop must be/);
});

test("textsInCrop: yalnız tam kəsik içində olan mətnlər (yarım piksel yuvarlaqlaşma ilə)", () => {
  const texts = [
    { text: "a", y: 0, h: 30 },
    { text: "b", y: 400, h: 22.4 },
    { text: "c", y: 410, h: 20 },
  ];
  assert.deepEqual(textsInCrop(texts, 422).map((t: { text: string }) => t.text), ["a", "b"]);
  assert.equal(textsInCrop(texts, null).length, 3);
});

test("cropImageTop: yuxarıdakı sətirləri saxlayır, qısa şəkli dəyişmir", () => {
  const img = { width: 2, height: 3, data: Buffer.from(Array.from({ length: 24 }, (_, i) => i)) };
  const top = cropImageTop(img, 2);
  assert.equal(top.height, 2);
  assert.deepEqual([...top.data], Array.from({ length: 16 }, (_, i) => i));
  assert.equal(cropImageTop(img, 5), img);
  assert.equal(cropImageTop(img, null), img);
});

test("selectTargets: VISUAL_ONLY boşdursa hamısı, əks halda <bp>/<name> hissəsi ilə", async () => {
  const { selectTargets } = await import("../visual/target-lib.mjs");
  const all = [
    { bp: "desktop", name: "catalog" },
    { bp: "mobile", name: "filter-type" },
    { bp: "mobile", name: "header" },
  ];
  assert.equal(selectTargets(all, undefined).length, 3);
  assert.equal(selectTargets(all, " ").length, 3);
  assert.deepEqual(selectTargets(all, "catalog, mobile/filter-").map((t: { name: string }) => t.name), ["catalog", "filter-type"]);
});

test("refOffset: [x, y] və ya {0,0}; yanlış forma rədd olunur", () => {
  assert.deepEqual(refOffset(undefined), { x: 0, y: 0 });
  assert.deepEqual(refOffset([24, 0]), { x: 24, y: 0 });
  for (const bad of [[24], [-1, 0], [1.5, 0], "24,0", { x: 24, y: 0 }]) assert.throws(() => refOffset(bad), /refOffset must be/);
});

test("cropImage: (x, y) nöqtəsindən verilən ölçüdə hissə; kənara çıxan rədd olunur", () => {
  // 3×2 şəkil, hər pikselin R kanalı = indeks
  const img = { width: 3, height: 2, data: Buffer.from(Array.from({ length: 6 }, (_, i) => [i, 0, 0, 255]).flat()) };
  const part = cropImage(img, { x: 1, y: 0, width: 2, height: 2 });
  assert.equal(part.width, 2);
  assert.deepEqual([0, 1, 2, 3].map((p) => part.data[p * 4]), [1, 2, 4, 5]);
  assert.equal(cropImage(img, { x: 0, y: 0, width: 3, height: 2 }), img);
  assert.throws(() => cropImage(img, { x: 2, y: 0, width: 2, height: 2 }), /outside/);
});

test("selectTargets: VISUAL_ONLY heç bir hədəfə uyğun gəlmirsə xəta", async () => {
  const { selectTargets } = await import("../visual/target-lib.mjs");
  assert.throws(() => selectTargets([{ bp: "desktop", name: "catalog" }], "yoxdur"), /matches no target/);
});

test("validateTarget: crop/refOffset/relayout səbəbsiz rədd olunur, səbəblə qəbul olunur", async () => {
  const { validateTarget } = await import("../visual/target-lib.mjs");
  const base = { bp: "mobile", name: "x" };
  assert.throws(() => validateTarget({ ...base, crop: 422 }), /crop requires cropReason/);
  assert.throws(() => validateTarget({ ...base, crop: 0, cropReason: "r" }), /crop must be/);
  assert.throws(() => validateTarget({ ...base, refOffset: [24, 0] }), /refOffset requires refOffsetReason/);
  assert.throws(() => validateTarget({ ...base, relayout: true }), /relayout requires relayoutReason/);
  assert.throws(() => validateTarget({ ...base, relayout: false, relayoutReason: "r" }), /relayout must be true/);
  assert.throws(() => validateTarget({ ...base, open: [] }), /open:/);
  assert.doesNotThrow(() => validateTarget({ ...base, crop: 422, cropReason: "r", refOffset: [24, 0], refOffsetReason: "r", relayout: true, relayoutReason: "r", open: ["a"] }));
  assert.doesNotThrow(() => validateTarget(base));
});

test("loadTargets: hamısını yoxlayır (seçilməyəni də), qismən işdə banner çap edir", async () => {
  const { loadTargets } = await import("../visual/target-lib.mjs");
  const ok = [
    { bp: "desktop", name: "catalog" },
    { bp: "mobile", name: "header" },
  ];
  const lines: string[] = [];
  assert.equal(loadTargets(ok, undefined, (l: string) => lines.push(l)).length, 2);
  assert.equal(lines.length, 0);
  assert.equal(loadTargets(ok, "catalog", (l: string) => lines.push(l)).length, 1);
  assert.match(lines[0], /PARTIAL RUN.*1 of 2/);
  assert.throws(() => loadTargets([...ok, { bp: "mobile", name: "bad", crop: 10 }], "catalog", () => {}), /crop requires cropReason/);
});

test("cropSizeError: element crop-dan qısadırsa xəta, əks halda null", async () => {
  const { cropSizeError } = await import("../visual/target-lib.mjs");
  assert.equal(cropSizeError(null, 10), null);
  assert.equal(cropSizeError(422, 2846), null);
  assert.equal(cropSizeError(422, 422), null);
  assert.match(cropSizeError(422, 300) ?? "", /300px high, shorter than crop 422px/);
});

test("validateTarget: union/patterns/cookies — səbəb və forma yoxlanılır", async () => {
  const { validateTarget } = await import("../visual/target-lib.mjs");
  const base = { bp: "desktop", name: "x", node: "1:1" };
  assert.throws(() => validateTarget({ ...base, union: ["1:2"] }), /union requires unionReason/);
  assert.throws(() => validateTarget({ ...base, union: [], unionReason: "r" }), /union must be/);
  assert.throws(() => validateTarget({ ...base, union: ["1:1"], unionReason: "r" }), /union must be/);
  assert.throws(() => validateTarget({ ...base, patterns: { "1519494": "^\\d{7}$" } }), /patterns requires patternReason/);
  assert.throws(() => validateTarget({ ...base, patterns: { a: "(" }, patternReason: "r" }), /patterns/);
  assert.throws(() => validateTarget({ ...base, cookies: { a: 1 } }), /cookies must be/);
  assert.doesNotThrow(() =>
    validateTarget({ ...base, union: ["1:2", "1:3"], unionReason: "r", patterns: { "1519494": "^\\d{7}$" }, patternReason: "r", cookies: { zv: "abc" } }),
  );
});

test("targetNodes: node + union sırası ilə", async () => {
  const { targetNodes } = await import("../visual/target-lib.mjs");
  assert.deepEqual(targetNodes({ node: "1:1" }), ["1:1"]);
  assert.deepEqual(targetNodes({ node: "1:1", union: ["1:3", "1:2"] }), ["1:1", "1:3", "1:2"]);
});

test("unionBox: qutuların ortaq sərhədi", async () => {
  const { unionBox } = await import("../visual/target-lib.mjs");
  assert.deepEqual(unionBox([{ x: 60, y: 473, width: 893, height: 104 }]), { x: 60, y: 473, width: 893, height: 104 });
  assert.deepEqual(
    unionBox([
      { x: 60, y: 473, width: 893, height: 104 },
      { x: 60, y: 601, width: 893, height: 1402 },
      { x: 10, y: 700, width: 10, height: 10 },
    ]),
    { x: 10, y: 473, width: 943, height: 1530 },
  );
});

test("referenceRect: kadr daxilində node qutusu — mövqe yuvarlaq, ölçü Figma export kimi yuxarı", async () => {
  const { referenceRect } = await import("../visual/target-lib.mjs");
  const frame = { x: 1000, y: 2000, width: 1440, height: 900 };
  assert.deepEqual(referenceRect(frame, { x: 1393, y: 2300, width: 656, height: 299 }), { x: 393, y: 300, width: 656, height: 299 });
  assert.deepEqual(referenceRect(frame, { x: 1060.4, y: 2210.6, width: 893.2, height: 20.01 }), { x: 60, y: 211, width: 894, height: 21 });
});

test("cropRegion: kənara çıxan hissə şəffaf piksellə doldurulur", async () => {
  const { cropRegion } = await import("../visual/target-lib.mjs");
  // 2×2 şəkil, R kanalı = indeks + 1, alfa 255
  const img = { width: 2, height: 2, data: Buffer.from(Array.from({ length: 4 }, (_, i) => [i + 1, 0, 0, 255]).flat()) };
  const part = cropRegion(img, { x: 1, y: 0, width: 2, height: 2 });
  assert.equal(part.width, 2);
  assert.equal(part.height, 2);
  assert.deepEqual([0, 1, 2, 3].map((p) => [part.data[p * 4], part.data[p * 4 + 3]]), [[2, 255], [0, 0], [4, 255], [0, 0]]);
  const inside = cropRegion(img, { x: 0, y: 1, width: 2, height: 1 });
  assert.deepEqual([inside.data[0], inside.data[4]], [3, 4]);
});
