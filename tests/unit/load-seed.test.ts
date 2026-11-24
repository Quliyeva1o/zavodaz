import { test } from "node:test";
import assert from "node:assert/strict";
import { assertLoadDb, mulberry32 } from "../../scripts/seed/load-lib.ts";

test("assertLoadDb: yalnız zavod_load bazasına icazə verir", () => {
  assert.doesNotThrow(() => assertLoadDb("postgres://u:p@localhost:5442/zavod_load"));
  assert.doesNotThrow(() => assertLoadDb("postgres://u:p@localhost:5442/zavod_load?sslmode=disable"));
});

test("assertLoadDb: dev bazası, oxşar ad, boş və yanlış URL rədd olunur", () => {
  for (const url of [
    "postgres://u:p@localhost:5442/zavod",
    "postgres://u:p@localhost:5442/zavod_load2",
    "postgres://u:p@localhost:5442/my_zavod_load",
    "postgres://u:p@localhost:5442/",
    "postgres://u:p@localhost:5442",
    "not a url",
    "",
  ]) {
    assert.throws(() => assertLoadDb(url), /yük seed-i yalnız zavod_load bazasında/, url);
  }
});

test("assertLoadDb: xəta mesajı sirri ifşa etmir", () => {
  try {
    assertLoadDb("postgres://user:topsecret@localhost:5442/zavod");
    assert.fail("atmalı idi");
  } catch (e) {
    assert.doesNotMatch(String(e), /topsecret/);
  }
});

test("mulberry32: eyni toxum eyni ardıcıllıq, [0,1) aralığı", () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 100; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
  assert.notEqual(mulberry32(1)(), mulberry32(2)());
});
