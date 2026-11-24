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
  const figma = ["Ağcabədi", "Ağdam", "Ağdaş", "Ağdərə", "Ağstafa", "Ağsu", "Astara", "Babək", "Bakı", "Beyləqan", "Bərdə", "Biləsuvar"];
  const cities = names("cities");
  let from = 0;
  for (const city of figma) {
    const at = cities.indexOf(city, from);
    assert.ok(at >= 0, `${city} missing or out of order`);
    from = at + 1;
  }
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

const AZ_ORDER = "abcçdeəfgğhxıijkqlmnoöprsştuüvyz";
const azKey = (text: string) => [...text.replace(/İ/g, "i").toLowerCase()].map((ch) => AZ_ORDER.indexOf(ch));

function azCompare(a: string, b: string): number {
  const ka = azKey(a);
  const kb = azKey(b);
  for (let i = 0; i < Math.min(ka.length, kb.length); i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
  return ka.length - kb.length;
}

test("cities are in Azerbaijani alphabetical order", () => {
  const names = DICTIONARY_SEED.cities.map((d) => d.name.az);
  for (const name of names) assert.ok(!azKey(name).includes(-1), `unknown letter in ${name}`);
  assert.deepEqual([...names].sort(azCompare), names);
  assert.equal(names[0], "Abşeron");
  assert.equal(names[names.indexOf("Bakı") + 1], "Balakən");
  assert.ok(names.includes("Xırdalan"));
});
