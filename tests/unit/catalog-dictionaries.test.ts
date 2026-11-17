import { test } from "node:test";
import assert from "node:assert/strict";
import { DICTIONARY_SEED } from "../../src/features/catalog/dictionaries.seed.ts";
import { slugify } from "../../src/features/catalog/slug.ts";

test("Figma filter values (Mob/Filtr frames), typos fixed", () => {
  const names = (k: keyof typeof DICTIONARY_SEED) => DICTIONARY_SEED[k].map((d) => d.name.az);
  assert.deepEqual(names("industries"), [
    "Metal emalı", "Maşınqayırma", "Tekstil (Toxuculuq)", "Qida sənayesi", "Kimya sənayesi",
    "Plastik və polimer emalı", "Tikinti materialları istehsalı", "Kənd təsərrüfatı istehsalı",
    "Ağac və mebel istehsalı", "Enerji və alternativ enerji istehsalı",
  ]);
  assert.deepEqual(names("productTypes"), [
    "Ərzaq məhsulları", "Sənaye avadanlıqları", "Əlvan metallar və profillər", "Paltar və tekstil məhsulları",
    "Plastik və qablaşdırma məhsulları", "Elektrik avadanlıqlar", "Tikinti materialları",
  ]);
  assert.deepEqual(names("productionModels"), [
    "İxrac yönümlü", "Daxili bazara yönəlmiş", "Xammal emalı müəssisəsi", "Hazır məhsul istehsalçısı",
    "OEM (Orijinal avadanlıq istehsalçısı)",
  ]);
  assert.deepEqual(names("cities").slice(0, 12), [
    "Ağcabədi", "Ağdam", "Ağdaş", "Ağdərə", "Ağstafa", "Ağsu", "Astara", "Babək", "Bakı", "Beyləqan", "Bərdə", "Biləsuvar",
  ]);
});

test("slugs are unique per dictionary and across cities + industries (landing segment)", () => {
  for (const list of Object.values(DICTIONARY_SEED)) {
    assert.equal(new Set(list.map((d) => d.slug)).size, list.length);
  }
  const both = [...DICTIONARY_SEED.cities, ...DICTIONARY_SEED.industries].map((d) => d.slug);
  assert.equal(new Set(both).size, both.length);
});

test("every slug is slugify(az name) and every entry has EN and RU names", () => {
  for (const list of Object.values(DICTIONARY_SEED)) {
    for (const d of list) {
      assert.equal(d.slug, slugify(d.name.az));
      assert.ok(d.name.en.trim() && d.name.ru.trim(), d.name.az);
    }
  }
});

test("cities are in Azerbaijani alphabetical order (only the two Figma-missing districts trail)", () => {
  const collator = new Intl.Collator("az");
  const names = DICTIONARY_SEED.cities.map((d) => d.name.az);
  assert.deepEqual(names.slice(-2), ["Abşeron", "Balakən"]);
  const main = names.slice(0, -2);
  assert.deepEqual([...main].sort(collator.compare), main);
});
