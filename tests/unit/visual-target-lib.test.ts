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
