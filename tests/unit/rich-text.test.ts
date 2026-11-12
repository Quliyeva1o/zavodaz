import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { RichText } from "../../src/lib/rich-text.tsx";

const html = (doc: unknown) => renderToStaticMarkup(RichText({ doc: doc as never }));

test("renders paragraphs, headings, lists and marks", () => {
  const out = html({
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Başlıq" }] },
      { type: "paragraph", content: [{ type: "text", text: "Qalın", marks: [{ type: "bold" }] }, { type: "text", text: " mətn" }] },
      { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Bir" }] }] }] },
    ],
  });
  assert.match(out, /<h2[^>]*>Başlıq<\/h2>/);
  assert.match(out, /<strong>Qalın<\/strong> mətn/);
  assert.match(out, /<ul[^>]*><li[^>]*><p[^>]*>Bir<\/p><\/li><\/ul>/);
});

test("links: only http(s) and mailto, external opens safely", () => {
  const bad = html({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }] });
  assert.doesNotMatch(bad, /javascript:/);
  assert.match(bad, />x</);
  const good = html({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "y", marks: [{ type: "link", attrs: { href: "https://zavod.az" } }] }] }] });
  assert.match(good, /href="https:\/\/zavod.az"/);
  assert.match(good, /rel="noopener"/);
});

test("unknown nodes and raw HTML are dropped / escaped", () => {
  const out = html({ type: "doc", content: [{ type: "iframe" }, { type: "paragraph", content: [{ type: "text", text: "<script>x</script>" }] }] });
  assert.doesNotMatch(out, /<iframe|<script>/);
  assert.match(out, /&lt;script&gt;/);
});

test("null doc renders nothing", () => {
  assert.equal(html(null), "");
});
