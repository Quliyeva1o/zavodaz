import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildThemeCss,
  parsePalette,
  resolveTextTokens,
  textStyleKey,
} from "../../scripts/figma/tokens-lib.mts";

test("parsePalette reads step/hex pairs scale by scale", () => {
  const texts = ["50", "#f7f7f8", "100", "#ededf1", "50", "#f5f6fa", "950", "#1a1c29"];
  assert.deepEqual(parsePalette(texts, ["gray", "brand"]), {
    "gray-50": "#F7F7F8",
    "gray-100": "#EDEDF1",
    "brand-50": "#F5F6FA",
    "brand-950": "#1A1C29",
  });
});

test("parsePalette fails loudly when Figma has more scales than names", () => {
  assert.throws(() => parsePalette(["50", "#ffffff"], []), /add a name/);
});

test("textStyleKey separates same-named styles with different values", () => {
  const a = { name: "Body Text/Medium", fontSize: 16, letterSpacing: -0.16, fontWeight: 400, lineHeightPx: 24 };
  const b = { ...a, letterSpacing: 0 };
  assert.equal(textStyleKey(a), "Body Text/Medium|16|-0.16");
  assert.equal(textStyleKey(b), "Body Text/Medium|16|0");
});

test("resolveTextTokens maps known styles and reports unknown ones", () => {
  const styles = [
    { name: "H1", fontSize: 50, letterSpacing: -2, fontWeight: 500, lineHeightPx: 57.5 },
    { name: "H1", fontSize: 50, letterSpacing: -2, fontWeight: 500, lineHeightPx: 57.5 },
    { name: "New style", fontSize: 13, letterSpacing: 0, fontWeight: 400, lineHeightPx: 18 },
  ];
  const { tokens, unknown } = resolveTextTokens(styles, { "H1|50|-2": "h1" });
  assert.equal(tokens.length, 1);
  assert.deepEqual(tokens[0], { token: "h1", figma: "H1|50|-2", fontSize: 50, lineHeightPx: 57.5, letterSpacing: -2, fontWeight: 500 });
  assert.deepEqual(unknown, ["New style|13|0"]);
});

test("buildThemeCss writes Tailwind v4 theme variables", () => {
  const css = buildThemeCss({ "brand-950": "#1A1C29" }, [
    { token: "body-md", figma: "Body Text/Medium|16|-0.16", fontSize: 16, lineHeightPx: 24, letterSpacing: -0.16, fontWeight: 400 },
  ]);
  assert.match(css, /--color-brand-950: #1A1C29;/);
  assert.match(css, /--text-body-md: 16px;/);
  assert.match(css, /--text-body-md--line-height: 24px;/);
  assert.match(css, /--text-body-md--letter-spacing: -0.16px;/);
  assert.match(css, /--text-body-md--font-weight: 400;/);
});
