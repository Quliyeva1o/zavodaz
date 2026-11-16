import { test } from "node:test";
import assert from "node:assert/strict";
import { checkRichDoc, parseRichDoc } from "../../src/features/pages/doc-schema.ts";
import { isSafeHref } from "../../src/features/pages/safe-href.ts";

const p = (...content: unknown[]) => ({ type: "paragraph", content });
const t = (text: unknown, marks?: unknown) => ({ type: "text", text, ...(marks === undefined ? {} : { marks }) });
const doc = (...content: unknown[]) => ({ type: "doc", content });

test("a valid document passes and is returned unchanged", () => {
  const ok = doc(
    { type: "heading", attrs: { level: 3 }, content: [t("H")] },
    p(t("a", [{ type: "bold" }, { type: "italic" }, { type: "link", attrs: { href: "mailto:a@b.az" } }]), { type: "hardBreak" }, t("b")),
    { type: "bulletList", content: [{ type: "listItem", content: [p(t("x")), { type: "orderedList", content: [{ type: "listItem", content: [p(t("y"))] }] }] }] },
  );
  assert.deepEqual(parseRichDoc(ok), ok);
  assert.deepEqual(parseRichDoc({ type: "doc" }), { type: "doc" });
});

test("unknown attrs are stripped", () => {
  const out = parseRichDoc(doc({ type: "heading", attrs: { level: 2, id: "x" }, content: [t("H", [{ type: "link", attrs: { href: "https://a.az", target: "_self", onclick: "x" } }])] }));
  assert.deepEqual(out, doc({ type: "heading", attrs: { level: 2 }, content: [t("H", [{ type: "link", attrs: { href: "https://a.az" } }])] }));
});

test("invalid shapes are rejected", () => {
  const bad: unknown[] = [
    null,
    "doc",
    { type: "doc", content: "x" },
    doc(null),
    doc("str"),
    doc({ type: "paragraph", content: "text" }),
    doc(p(t("a", "bold"))),
    doc(p(t("a", { type: "bold" }))),
    doc(p(t({ a: 1 }))),
    doc(p(t("a", [{ type: "link", attrs: { href: "javascript:alert(1)" } }]))),
    doc(p(t("a", [{ type: "underline" }]))),
    doc({ type: "heading", attrs: { level: 1 }, content: [t("H")] }),
    doc({ type: "heading", content: [t("H")] }),
    doc({ type: "script", content: [] }),
    doc({ type: "listItem", content: [p(t("x"))] }),
    doc({ type: "bulletList", content: [p(t("x"))] }),
    doc(p({ type: "paragraph", content: [] })),
  ];
  for (const value of bad) assert.equal(parseRichDoc(value), null, JSON.stringify(value));
});

test("depth and size are capped", () => {
  const nest = (levels: number): unknown => {
    let inner: unknown = p(t("x"));
    for (let i = 0; i < levels; i++) inner = { type: "bulletList", content: [{ type: "listItem", content: [inner] }] };
    return inner;
  };
  assert.ok(parseRichDoc(doc(nest(3))));
  assert.equal(parseRichDoc(doc(nest(4))), null); // paragraph would sit at depth 9
  assert.equal(parseRichDoc(doc(...Array.from({ length: 2600 }, () => p(t("x"))))), null); // 5200 nodes
});

test("checkRichDoc names the reason of a rejection", () => {
  const nest = (levels: number): unknown => {
    let inner: unknown = p(t("x"));
    for (let i = 0; i < levels; i++) inner = { type: "bulletList", content: [{ type: "listItem", content: [inner] }] };
    return inner;
  };
  const item = (...content: unknown[]) => ({ type: "bulletList", content: [{ type: "listItem", content }] });
  const reason = (value: unknown) => {
    const r = checkRichDoc(value);
    return r.ok ? "ok" : r.reason;
  };
  assert.equal(reason(doc(p(t("a")))), "ok");
  assert.equal(reason(doc(p(t("a", [{ type: "link", attrs: { href: "javascript:alert(1)" } }])))), "link");
  assert.equal(reason(doc(p(t("a", [{ type: "link", attrs: { href: "https:example.az" } }])))), "link");
  assert.equal(reason(doc(item({ type: "heading", attrs: { level: 2 }, content: [t("H")] }))), "heading");
  assert.equal(reason(doc(nest(4))), "depth");
  assert.equal(reason(doc(...Array.from({ length: 2600 }, () => p(t("x"))))), "size");
  assert.equal(reason(doc({ type: "script", content: [] })), "invalid");
  assert.equal(reason(null), "invalid");
});

test("editor and server share one link rule", () => {
  for (const ok of ["https://zavod.az", "http://a.az/b", "mailto:info@zavod.az", "HTTPS://A.AZ"]) assert.ok(isSafeHref(ok), ok);
  for (const bad of ["https:zavod.az", "http:/a.az", "javascript:alert(1)", "ftp://a.az", "/relative", ""]) assert.ok(!isSafeHref(bad), bad);
});
