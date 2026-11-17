import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { processImage } from "../../src/features/media/process.ts";
import { mediaSrc, mediaSrcSet, isMediaPath } from "../../src/features/media/url.ts";

test("processImage makes WebP variants no wider than the original, plus a tiny blur", async () => {
  const out = await processImage(await readFile("tests/fixtures/sample.jpg"));
  assert.deepEqual(out.files.map((f) => f.width), [320, 640, 960]);
  assert.equal((await sharp(out.files[0].data).metadata()).format, "webp");
  assert.match(out.blur, /^data:image\/webp;base64,/);
  assert.ok(out.blur.length < 1200);
});

test("a small image still gets one variant at its own width", async () => {
  const small = await sharp({ create: { width: 200, height: 100, channels: 3, background: "#888" } }).jpeg().toBuffer();
  const out = await processImage(small);
  assert.deepEqual(out.files.map((f) => f.width), [200]);
});

test("URLs and the strict path check", () => {
  const m = { id: "0b8f7a7e-0000-4000-8000-000000000001", variants: [320, 640, 960] };
  assert.equal(mediaSrc(m, 600), "/media/0b8f7a7e-0000-4000-8000-000000000001/640.webp");
  assert.equal(mediaSrc(m, 2000), "/media/0b8f7a7e-0000-4000-8000-000000000001/960.webp");
  assert.match(mediaSrcSet(m), /320\.webp 320w, .*640\.webp 640w, .*960\.webp 960w$/);
  assert.equal(isMediaPath(["0b8f7a7e-0000-4000-8000-000000000001", "640.webp"]), true);
  assert.equal(isMediaPath(["..", "etc", "passwd"]), false);
  assert.equal(isMediaPath(["0b8f7a7e-0000-4000-8000-000000000001", "640.png"]), false);
});
