import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { processImage, UnsupportedFormatError } from "../../src/features/media/process.ts";
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

test("EXIF orientation 6 (90° turn): width/height and the variants are the displayed (rotated) ones", async () => {
  // stored 400x200 landscape with orientation 6 → displayed 200x400 portrait
  const rotated = await sharp({ create: { width: 400, height: 200, channels: 3, background: "#888" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const out = await processImage(rotated);
  assert.equal(out.width, 200);
  assert.equal(out.height, 400);
  assert.deepEqual(out.files.map((f) => f.width), [200]);
  const meta = await sharp(out.files[0].data).metadata();
  assert.equal(meta.width, 200);
  assert.equal(meta.height, 400);
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

test("every width processImage produces is a valid media path, incl. images under 320px", async () => {
  const id = "0b8f7a7e-0000-4000-8000-000000000001";
  const small = await sharp({ create: { width: 200, height: 100, channels: 3, background: "#888" } }).jpeg().toBuffer();
  for (const input of [await readFile("tests/fixtures/sample.jpg"), small]) {
    const out = await processImage(input);
    for (const f of out.files) assert.equal(isMediaPath([id, `${f.width}.webp`]), true, String(f.width));
  }
  assert.equal(mediaSrc({ id, variants: [200] }, 640), `/media/${id}/200.webp`);
  assert.equal(isMediaPath([id, "0.webp"]), false);
  assert.equal(isMediaPath([id, "1000.webp"]), false);
  assert.equal(isMediaPath([id, "../640.webp"]), false);
});

test("content that is not JPEG/PNG/WebP is rejected whatever the MIME type said", async () => {
  const gif = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#888" } }).gif().toBuffer();
  await assert.rejects(processImage(gif), UnsupportedFormatError);
});

test("oversized pixel counts are rejected (decompression bomb guard)", async () => {
  const huge = await sharp({ create: { width: 7000, height: 6000, channels: 3, background: "#000" } }).png({ compressionLevel: 9 }).toBuffer();
  await assert.rejects(processImage(huge));
});
