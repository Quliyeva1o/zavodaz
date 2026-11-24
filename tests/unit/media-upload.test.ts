import { test } from "node:test";
import assert from "node:assert/strict";
import { BodyTooLargeError, isSameOrigin, readCapped, UPLOAD_BODY_LIMIT } from "../../src/features/media/upload-body.ts";
import { MAX_UPLOAD_BYTES } from "../../src/features/media/url.ts";

const stream = (sizes: number[]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      for (const n of sizes) c.enqueue(new Uint8Array(n).fill(7));
      c.close();
    },
  });

test("upload body limit is 8 MB plus a small multipart overhead", () => {
  assert.ok(UPLOAD_BODY_LIMIT > MAX_UPLOAD_BYTES);
  assert.ok(UPLOAD_BODY_LIMIT - MAX_UPLOAD_BYTES <= 128 * 1024);
});

test("readCapped returns the whole body under the cap", async () => {
  const bytes = await readCapped(stream([3, 4, 5]), 12);
  assert.equal(bytes.byteLength, 12);
  assert.equal(bytes[11], 7);
  assert.equal((await readCapped(null, 10)).byteLength, 0);
});

test("readCapped stops as soon as the streamed bytes pass the cap (Content-Length is not trusted)", async () => {
  let pulled = 0;
  const endless = new ReadableStream<Uint8Array>({
    pull(c) {
      pulled++;
      c.enqueue(new Uint8Array(1000));
    },
  });
  await assert.rejects(readCapped(endless, 2500), BodyTooLargeError);
  assert.ok(pulled <= 4, `read ${pulled} chunks`);
  await assert.rejects(readCapped(stream([6, 6]), 11), BodyTooLargeError);
});

test("isSameOrigin: the site origin or the request's own host; a missing or foreign Origin is refused", () => {
  const site = "https://new.zavod.az";
  assert.equal(isSameOrigin("https://new.zavod.az", "127.0.0.1:3000", site), true);
  assert.equal(isSameOrigin("http://localhost:3100", "localhost:3100", site), true);
  assert.equal(isSameOrigin("https://evil.example", "localhost:3100", site), false);
  assert.equal(isSameOrigin("https://localhost:3100.evil.example", "localhost:3100", site), false);
  assert.equal(isSameOrigin(null, "localhost:3100", site), false);
  assert.equal(isSameOrigin("null", "localhost:3100", site), false);
  assert.equal(isSameOrigin("not a url", null, site), false);
});
