import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { type Browser, type Page, chromium } from "@playwright/test";
import { WS_SOURCE, findBlocks } from "../visual/geometry-lib.mjs";

let browser: Browser;
let page: Page;
before(async () => {
  browser = await chromium.launch({ channel: "chrome" });
  page = await browser.newPage({ viewport: { width: 400, height: 600 } });
});
after(async () => {
  await browser.close();
});

type Box = { x: number; y: number; h: number };
async function find(html: string, wanted: string[]): Promise<Record<string, Box | undefined>> {
  await page.setContent(`<body style="margin:0"><div id="root" style="margin:10px 20px">${html}</div></body>`);
  await page.evaluate("globalThis.__name = (f) => f"); // tsx (esbuild keepNames) wraps in-page functions with __name
  return (await page.evaluate(findBlocks, ["#root", wanted, WS_SOURCE] as [string, string[], string])) as Record<string, Box | undefined>;
}

test("findBlocks: bir neçə <p> konteynerlə uyğun gəlir, qutu hədəfə görə nisbidir", async () => {
  const r = await find(`<section id="a"><p>Birinci   abzas.</p>\n<p>İkinci abzas.</p></section>`, ["Birinci abzas. İkinci abzas."]);
  const box = r["Birinci abzas. İkinci abzas."];
  assert.ok(box);
  assert.equal(box.x, 0);
  assert.equal(box.y, 0);
  assert.ok(box.h > 0);
});

test("findBlocks: eyni mətnli iç-içə sarğılarda ən dərini seçir", async () => {
  const r = await find(`<div style="padding:5px"><div style="padding:7px"><p>Bir</p><p>İki</p></div></div>`, ["Bir İki"]);
  assert.equal(r["Bir İki"]?.x, 5); // iç div (x=5), xarici div (x=0) yox
});

test("findBlocks: gizli element uyğun gəlmir", async () => {
  const r = await find(`<div style="display:none"><p>Gizli</p><p>mətn</p></div>`, ["Gizli mətn"]);
  assert.deepEqual(r, {});
});

test("findBlocks: tapılmayan mətn nəticədə yoxdur", async () => {
  const r = await find(`<p>Var</p><p>olan</p>`, ["Yoxdur burada"]);
  assert.deepEqual(r, {});
});
