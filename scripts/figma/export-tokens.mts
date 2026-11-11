// Writes src/styles/tokens.css from Figma: colour scales (frame "Colour Palette") and every
// text style used anywhere in the file. Run again whenever the design changes.
import { writeFile } from "node:fs/promises";
import { findNode, getFile, walk, type FigmaNode } from "./api.mts";
import { buildThemeCss, parsePalette, resolveTextTokens, type FigmaTextStyle } from "./tokens-lib.mts";

const PALETTE_FRAME = "2:43";
/** Scales in the order they appear in the frame (Santas Gray, East Bay, red, green). */
const SCALES = ["gray", "brand", "red", "green"];
/** Colours used in the design that are not part of the palette frame. */
const EXTRA_COLORS: Record<string, string> = {
  star: "#F2CC50",
  success: "#5ECA83",
  "whatsapp-bg": "#F2FBF5",
  "whatsapp-border": "#C3EFD1",
  "whatsapp-text": "#1C4B2E",
};
/** Figma style (name|size|letter-spacing) → token. New styles must be added here on purpose. */
const TEXT_MAP: Record<string, string> = {
  "H1|50|-2": "h1",
  "H2|40|-1.2": "h2",
  "H3|32|-0.96": "h3",
  "H4|28|-0.56": "h4",
  "H5|24|-0.48": "h5",
  "Mob/H1|28|-1.12": "mob-h1",
  "Mob/H2|24|-0.72": "mob-h2",
  "Mob/Subtitle|18|-0.36": "mob-subtitle",
  "Mob/Subtitle 2|16|-0.32": "mob-subtitle-2",
  "Subtitle 1/Medium|22|-0.44": "subtitle-1-medium",
  "Subtitle 1/Regular|22|-0.44": "subtitle-1",
  "Subtitle 2/Medium|20|-0.4": "subtitle-2-medium",
  "Subtitle 2/Regular|20|-0.4": "subtitle-2",
  "Subtitle 2/Medium|16|0": "subtitle-2s-medium",
  "Subtitle 2/Regular|16|0": "subtitle-2s",
  "Subtitle 2/SemiBold|16|0": "subtitle-2s-semibold",
  "Subtitle 3/Medium|18|-0.36": "subtitle-3-medium",
  "Subtitle 3/Regular|18|-0.36": "subtitle-3",
  "Body Text/Large|18|-0.36": "body-lg",
  "Body Text/Medium|16|-0.16": "body-md",
  "Body Text/Medium|16|0": "body-md-flat",
  "Body Text/Small|14|-0.14": "body-sm",
  "Body Text/Small|14|0": "body-sm-flat",
  "Caption|12|0.048": "caption",
  "Caption|12|-0.12": "caption-tight",
  "Label/Paragraph/X Small|12|0": "label-xs",
  "Overline|10|-0.1": "overline",
};

const file = await getFile();
const frame = findNode(file.document, PALETTE_FRAME);
if (!frame) throw new Error(`Palette frame ${PALETTE_FRAME} not found`);

const paletteTexts: string[] = [];
walk(frame, (n) => n.type === "TEXT" && n.characters && paletteTexts.push(n.characters));
const colors = { ...parsePalette(paletteTexts, SCALES), ...EXTRA_COLORS };

const styles: FigmaTextStyle[] = [];
walk(file.document, (n: FigmaNode) => {
  const styleId = n.styles?.text;
  if (n.type !== "TEXT" || !styleId || !n.style) return;
  const name = file.styles[styleId]?.name;
  if (name) styles.push({ name, ...n.style });
});

const { tokens, unknown } = resolveTextTokens(styles, TEXT_MAP);
if (unknown.length) {
  console.error("New Figma text styles — add them to TEXT_MAP:\n  " + unknown.join("\n  "));
  process.exit(1);
}

await writeFile("src/styles/tokens.css", buildThemeCss(colors, tokens));
console.log(`tokens.css: ${Object.keys(colors).length} colours, ${tokens.length} text styles (Figma ${file.lastModified})`);
