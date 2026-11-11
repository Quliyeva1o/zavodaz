// Exports icons (SVG, exactly as drawn) and the logo (PNG 1x/2x/3x → lossless WebP) from Figma.
// Node ids are the instances used in Header / Footer / mobile menu; when the designer replaces a
// node, the script stops with "not found" — update the id with `npm run figma:inspect`.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { download, exportImages } from "./api.mts";

const ICONS: Record<string, string> = {
  phone: "I143:1693;129:1658;12:1143",
  "user-white": "I143:1693;129:1671;12:293",
  "caret-down": "I143:1693;129:1670",
  "caret-right": "144:4009",
  whatsapp: "I143:1693;129:1661",
  list: "685:20718",
  close: "682:20707",
  // Footer social buttons: the whole 40×40 circle (background + glyph).
  "social-facebook": "I143:2121;704:20430",
  "social-instagram": "I143:2121;704:20432",
  "social-linkedin": "I143:2121;704:20434",
  "social-x": "I143:2121;704:20436",
  "social-youtube": "I143:2121;704:20444",
  "social-tiktok": "I143:2121;704:20446",
};

const LOGOS: Record<string, string> = {
  header: "I143:1693;129:1655",
  "header-mobile": "685:20712",
  footer: "I143:2121;52:3439",
  "footer-mobile": "I685:21139;682:20130",
};

const svgUrls = await exportImages(Object.values(ICONS), { format: "svg" });
for (const [name, id] of Object.entries(ICONS)) {
  await download(svgUrls[id], `public/icons/${name}.svg`);
}
console.log(`icons: ${Object.keys(ICONS).length}`);

await mkdir("design/.cache/logo", { recursive: true });
for (const scale of [1, 2, 3]) {
  const urls = await exportImages(Object.values(LOGOS), { format: "png", scale });
  for (const [name, id] of Object.entries(LOGOS)) {
    const png = `design/.cache/logo/${name}@${scale}x.png`;
    await download(urls[id], png);
    await mkdir("public/brand", { recursive: true });
    await writeFile(`public/brand/logo-${name}@${scale}x.webp`, await sharp(await readFile(png)).webp({ lossless: true }).toBuffer());
  }
}
await rm("design/.cache/logo", { recursive: true });
console.log(`logos: ${Object.keys(LOGOS).length} × 3 scales`);
