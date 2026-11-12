import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JsonLd } from "../../src/lib/json-ld.tsx";

test("JsonLd cannot be closed by content and round-trips", () => {
  const data = { a: "</script><img src=x>", b: String.fromCharCode(0x2028, 0x2029) };
  const out = renderToStaticMarkup(createElement(JsonLd, { data }));
  assert.doesNotMatch(out, /<\/script><img/);
  assert.ok(out.includes("\\u003c/script"));
  assert.ok(!out.includes(String.fromCharCode(0x2028)) && !out.includes(String.fromCharCode(0x2029)));
  const body = out.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
  assert.deepEqual(JSON.parse(body), data);
});
