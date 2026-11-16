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

const p = (content: unknown[]) => ({ type: "doc", content: [{ type: "paragraph", content }] });
const link = (href: string, text = "t") => p([{ type: "text", text, marks: [{ type: "link", attrs: { href } }] }]);

test("unsafe link schemes are dropped but text is kept", () => {
  for (const h of ["JaVaScRiPt:alert(1)", " javascript:alert(1)", "data:text/html,x"]) {
    const out = html(link(h));
    assert.doesNotMatch(out, /href|javascript|data:/i, h);
    assert.match(out, />t</);
  }
});

test("mailto accepted; HTTPS in caps is external", () => {
  const m = html(link("mailto:a@b.az"));
  assert.match(m, /href="mailto:a@b.az"/);
  assert.doesNotMatch(m, /target=/);
  const up = html(link("HTTPS://x.az"));
  assert.match(up, /target="_blank"/);
  assert.match(up, /rel="noopener"/);
});

test("unknown mark dropped, italic, nested marks", () => {
  assert.match(html(p([{ type: "text", text: "u", marks: [{ type: "underline" }] }])), /<p[^>]*>u<\/p>/);
  assert.match(html(p([{ type: "text", text: "i", marks: [{ type: "italic" }] }])), /<em>i<\/em>/);
  const n = html(p([{ type: "text", text: "n", marks: [{ type: "bold" }, { type: "link", attrs: { href: "https://x.az" } }] }]));
  assert.match(n, /<a [^>]*><strong>n<\/strong><\/a>/);
});

test("orderedList, h3, heading level 1 -> h2, hardBreak, empty content", () => {
  const out = html({
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "H3" }] },
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "H1" }] },
      { type: "orderedList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "o" }] }] }] },
      { type: "paragraph", content: [{ type: "text", text: "a" }, { type: "hardBreak" }, { type: "text", text: "b" }] },
    ],
  });
  assert.match(out, /<h3[^>]*>H3<\/h3>/);
  assert.match(out, /<h2[^>]*>H1<\/h2>/);
  assert.doesNotMatch(out, /<h1/);
  assert.match(out, /<ol[^>]*><li[^>]*><p[^>]*>o<\/p><\/li><\/ol>/);
  assert.match(out, /a<br\/>b/);
  assert.equal(html({ type: "doc", content: [] }), "");
});

test("malformed data already in the database never throws", () => {
  const cases: unknown[] = [
    { type: "doc", content: "x" },
    { type: "doc", content: [null, "s", 5, { type: "paragraph", content: null }] },
    { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: { a: 1 } }, { type: "text", text: "ok", marks: "bold" }, { type: "text", text: "m", marks: [null, 3, { type: "bold" }] }] }] },
  ];
  for (const c of cases) assert.doesNotThrow(() => html(c));
  assert.equal(html({ type: "doc", content: "x" }), "");
  const mixed = html(cases[2]);
  assert.match(mixed, /ok/);
  assert.match(mixed, /<strong>m<\/strong>/);
  assert.doesNotMatch(mixed, /object/);
});

test("too deep nesting stops rendering", () => {
  let inner: unknown = { type: "paragraph", content: [{ type: "text", text: "deep" }] };
  for (let i = 0; i < 20; i++) inner = { type: "bulletList", content: [{ type: "listItem", content: [inner] }] };
  assert.doesNotMatch(html({ type: "doc", content: [inner] }), /deep/);
});
