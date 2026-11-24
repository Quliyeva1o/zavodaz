import { test } from "node:test";
import assert from "node:assert/strict";
import {
  factoryDescription,
  factoryFeatures,
  factoryTitle,
  formatDay,
  organizationJsonLd,
  parsePageParam,
  salaryText,
  websiteLabel,
} from "../../src/features/factory/view.ts";
import type { Dictionaries } from "../../src/features/catalog/types.ts";
import type { FactoryPage } from "../../src/features/factory/types.ts";

const dicts: Dictionaries = {
  cities: [{ id: 1, slug: "baki", name: { az: "Bakı", en: "Baku", ru: "Баку" } }],
  industries: [{ id: 2, slug: "qida", name: { az: "Qida sənayesi", en: "Food industry", ru: "Пищевая" } }],
  productTypes: [{ id: 3, slug: "erzaq", name: { az: "Ərzaq məhsulları", en: "Food products", ru: "Продукты" } }],
  productionModels: [
    { id: 4, slug: "hazir", name: { az: "Hazır məhsul istehsalçısı", en: "Finished goods", ru: "Готовая продукция" } },
    { id: 5, slug: "xammal", name: { az: "Xammal", en: "Raw materials", ru: "Сырьё" } },
  ],
};

const base: FactoryPage = {
  id: "f1",
  slug: "agro",
  type: "fabrik",
  status: "published",
  name: "Agro Trade Supply",
  legalName: "Agro Trade Supply MMC",
  about: "",
  equipmentText: "",
  employeeCount: null,
  capacityText: "",
  phone: "",
  email: "",
  website: "",
  address: "",
  youtubeUrl: "",
  socials: {},
  industryId: null,
  productTypeId: null,
  cityId: null,
  productionModelIds: [],
  cooperation: [],
  verified: false,
  ratingAvg: 0,
  ratingCount: 0,
  updatedAt: new Date(0),
  cover: null,
  logo: null,
  images: [],
  certificates: [],
  files: [],
};

test("features: six cards in Figma order; dictionary names in the page language; empty values are '-'", () => {
  const empty = factoryFeatures(base, dicts, "az");
  assert.deepEqual(
    empty.map((f) => f.label),
    ["İstehsal sahəsi", "İstehsal olunan məhsul tipi", "İstehsalat modeli", "Əməkdaşlıq imkanı", "Ümumi işçi sayı", "Gündəlik/Aylıq istehsal gücü"],
  );
  assert.ok(empty.every((f) => f.value === "-"));

  const full = factoryFeatures(
    { ...base, industryId: 2, productTypeId: 3, productionModelIds: [4, 5, 99], cooperation: ["partner", "sales"], employeeCount: 240, capacityText: "10 t / gün" },
    dicts,
    "en",
  );
  assert.deepEqual(
    full.map((f) => f.value),
    ["Food industry", "Food products", "Finished goods, Raw materials", "Looking for a partner, Looking for a sales agent", "240", "10 t / gün"],
  );
  // An id that is no longer in the dictionary (deleted) shows "-", not an empty card.
  assert.equal(factoryFeatures({ ...base, industryId: 77 }, dicts, "az")[0].value, "-");
});

test("title: 'Ad — Tip | Zavod.az' on the about tab, the tab name on the others", () => {
  assert.equal(factoryTitle("Agro", "Fabrik"), "Agro — Fabrik | Zavod.az");
  assert.equal(factoryTitle("Agro", "Fabrik", "Media"), "Agro — Media | Zavod.az");
});

test("description: the about text on one line, at most 160 characters, cut at a word", () => {
  assert.equal(factoryDescription("  Bir\n\niki   üç  "), "Bir iki üç");
  const long = "söz ".repeat(60);
  const d = factoryDescription(long);
  assert.ok(d.length <= 160, String(d.length));
  assert.ok(d.endsWith("…"));
  assert.ok(!d.includes("  "));
  assert.equal(factoryDescription(""), "");
});

test("page parameter: 1 by default; positive integers only", () => {
  assert.equal(parsePageParam(undefined), 1);
  assert.equal(parsePageParam("3"), 3);
  assert.equal(parsePageParam(["2", "5"]), 2);
  for (const bad of ["0", "-1", "abc", "1.5", "999999"]) assert.equal(parsePageParam(bad), 1, bad);
});

test("salary, date and website label as on the vacancy card / contact card", () => {
  assert.equal(salaryText(1200, "AZN"), "1200₼");
  assert.equal(salaryText(900, "USD"), "900 USD");
  assert.equal(salaryText(null, "AZN"), null);
  assert.equal(formatDay(new Date("2025-05-04T22:30:00Z")), "05.05.2025"); // Baku time
  assert.equal(websiteLabel("https://www.agrotradesupply.az/"), "www.agrotradesupply.az");
  assert.equal(websiteLabel("http://agro.az/haqqinda"), "agro.az/haqqinda");
});

test("Organization JSON-LD: name, url, logo, contacts and socials; no rating (self-serving review rule)", () => {
  const data = organizationJsonLd(
    { ...base, phone: "+994 50 000 00 00", email: "a@b.az", website: "https://agro.az", address: "Bakı", socials: { facebook: "https://fb.com/agro" }, logo: { id: "m1", variants: [320], blur: "", width: 1, height: 1 } },
    { url: "https://zavod.az/fabrik/agro", origin: "https://zavod.az", description: "Desc" },
  );
  assert.equal(data["@type"], "Organization");
  assert.equal(data.name, "Agro Trade Supply");
  assert.equal(data.legalName, "Agro Trade Supply MMC");
  assert.equal(data.url, "https://zavod.az/fabrik/agro");
  assert.equal(data.logo, "https://zavod.az/media/m1/320.webp");
  assert.equal(data.telephone, "+994 50 000 00 00");
  assert.deepEqual(data.sameAs, ["https://agro.az", "https://fb.com/agro"]);
  assert.ok(!("aggregateRating" in data));
  const bare = organizationJsonLd(base, { url: "u", origin: "o", description: "" });
  assert.ok(!("logo" in bare) && !("telephone" in bare) && !("sameAs" in bare) && !("description" in bare));
});
