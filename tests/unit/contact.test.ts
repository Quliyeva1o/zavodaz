import { test } from "node:test";
import assert from "node:assert/strict";
import { parseContactForm } from "../../src/features/contact/schema.ts";
import { defaultContactSettings, mergeContactSettings } from "../../src/features/contact/settings.ts";

test("default topics are the user's list", () => {
  assert.deepEqual(defaultContactSettings.topics.map((t) => t.label.az), ["Əməkdaşlıq", "Paket ödənişləri", "Reklam", "Digər"]);
});

test("broken stored settings fall back to defaults", () => {
  assert.deepEqual(mergeContactSettings({ topics: "x" }), defaultContactSettings);
  assert.deepEqual(mergeContactSettings(undefined), defaultContactSettings);
});

test("stored notify emails are kept", () => {
  const s = mergeContactSettings({ ...defaultContactSettings, notifyEmails: ["info@zavod.az"] });
  assert.deepEqual(s.notifyEmails, ["info@zavod.az"]);
});

// ---------- Contact form (Task 7) ----------

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const valid = { firstName: "Aysel", lastName: "Məmmədova", email: "a@b.az", phone: "+994 50 123 45 67", topic: "advertising", message: "Salam" };

test("valid contact form parses and trims", () => {
  const r = parseContactForm(form({ ...valid, firstName: "  Aysel " }), ["advertising", "other"]);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.data.firstName, "Aysel");
});

test("errors are dictionary keys per field", () => {
  const r = parseContactForm(form({ ...valid, email: "x", phone: "12", topic: "nope", message: "a".repeat(201), firstName: "" }), ["advertising"]);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.errors.email, "email");
    assert.equal(r.errors.phone, "phone");
    assert.equal(r.errors.topic, "topic");
    assert.equal(r.errors.message, "tooLong");
    assert.equal(r.errors.firstName, "required");
  }
});

test("empty fields are 'required', an empty topic is 'topic'; typed values come back", () => {
  const r = parseContactForm(form({ firstName: "Aysel" }), ["advertising"]);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.deepEqual(r.errors, { lastName: "required", email: "required", phone: "required", topic: "topic", message: "required" });
    assert.equal(r.values.firstName, "Aysel");
  }
});

test("single-line fields reject line breaks (mail header / body injection)", () => {
  const r = parseContactForm(form({ ...valid, firstName: "Ay\r\nsel", lastName: "Məm\nmədova", phone: "+994 50\n123 45 67" }), ["advertising"]);
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(r.errors, { firstName: "invalid", lastName: "invalid", phone: "phone" });
});

test("phone allows plain spaces, brackets and dashes only", () => {
  const ok = (phone: string) => parseContactForm(form({ ...valid, phone }), ["advertising"]).ok;
  assert.equal(ok("+994 (50) 123-45-67"), true);
  assert.equal(ok("+994\t50 123 45 67"), false);
});

test("the message may have several lines", () => {
  assert.equal(parseContactForm(form({ ...valid, message: "Salam\nNecəsiz?" }), ["advertising"]).ok, true);
});
