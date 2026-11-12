import { test } from "node:test";
import assert from "node:assert/strict";
import { joinTarget } from "../../src/features/tariffs/join.ts";

test("signed-in factory goes to cabinet tariffs with the plan", () => {
  assert.equal(joinTarget({ lang: "az", plan: "premium", role: "factory", knownDevice: true }), "/kabinet/tarifler?plan=premium");
  assert.equal(joinTarget({ lang: "en", plan: "vip", role: "factory", knownDevice: false }), "/en/cabinet/pricing?plan=vip");
});

test("known device without session goes to login, then back to cabinet tariffs", () => {
  assert.equal(
    joinTarget({ lang: "az", plan: "premium", role: null, knownDevice: true }),
    "/daxil-ol?next=" + encodeURIComponent("/kabinet/tarifler?plan=premium"),
  );
});

test("new visitor goes to registration with the plan", () => {
  assert.equal(joinTarget({ lang: "ru", plan: "vip", role: null, knownDevice: false }), "/ru/registraciya?plan=vip");
});

test("admins are treated as visitors; unknown plans are dropped", () => {
  assert.equal(joinTarget({ lang: "az", plan: "x", role: "admin", knownDevice: false }), "/qeydiyyat");
});
