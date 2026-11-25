import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeIp } from "../../src/lib/ip-normalize.ts";

test("IPv4 dəyişmir", () => {
  assert.equal(normalizeIp("203.0.113.77"), "203.0.113.77");
  assert.equal(normalizeIp("10.0.0.1"), "10.0.0.1");
});

test("IPv4-mapped IPv6 IPv4 sayılır", () => {
  assert.equal(normalizeIp("::ffff:1.2.3.4"), "1.2.3.4");
  assert.equal(normalizeIp("::FFFF:1.2.3.4"), "1.2.3.4");
  assert.equal(normalizeIp("::ffff:0102:0304"), "1.2.3.4");
  assert.equal(normalizeIp("0:0:0:0:0:ffff:1.2.3.4"), "1.2.3.4");
});

test("IPv6 /64 prefiksinə endirilir: eyni /64-dəki ünvanlar eyni açardır", () => {
  const a = normalizeIp("2001:db8:1:2:aaaa:bbbb:cccc:dddd");
  assert.equal(a, "2001:db8:1:2::/64");
  assert.equal(normalizeIp("2001:db8:1:2::1"), a);
  assert.equal(normalizeIp("2001:0DB8:0001:0002:0:0:0:ffff"), a);
  assert.equal(normalizeIp("2001:db8:1:2:ffff:ffff:ffff:ffff%eth0"), a);
  assert.notEqual(normalizeIp("2001:db8:1:3::1"), a);
});

test("qısaldılmış formalar: :: başda, sonda, ortada", () => {
  assert.equal(normalizeIp("::1"), "0:0:0:0::/64");
  assert.equal(normalizeIp("2001:db8::"), "2001:db8:0:0::/64");
  assert.equal(normalizeIp("2001:db8::5:1"), "2001:db8:0:0::/64");
  assert.equal(normalizeIp("fe80::1"), "fe80:0:0:0::/64");
});

test("tanınmayan dəyər olduğu kimi qalır", () => {
  assert.equal(normalizeIp("unknown"), "unknown");
  assert.equal(normalizeIp("not:an:ip"), "not:an:ip");
});
