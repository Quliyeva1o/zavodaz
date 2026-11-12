import { test } from "node:test";
import assert from "node:assert/strict";
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
