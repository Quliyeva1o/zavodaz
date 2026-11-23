// Pure helpers shared by capture.mjs, geometry.mjs and compare.mjs for target options (unit-tested):
//   open: a selector or an array of selectors clicked one after another (e.g. the mobile "Filtr" button, then a row);
//   crop: only the top N px of the target are checked (a Figma frame taller than what the site shows the same way,
//         e.g. the mobile catalog list: 8 Figma cards vs 15 per page — title, "Filtr" button and the first card);
//   refOffset: [x, y] of the target's box inside the Figma export, when the export is larger than the node because
//         children's effects overflow it (the mobile cards' drop shadow: 24px each side).

/** `open` as a list of selectors (undefined → none). */
export function openSteps(open) {
  if (open === undefined) return [];
  const steps = Array.isArray(open) ? open : [open];
  if (!steps.length || steps.some((s) => typeof s !== "string" || !s.trim())) throw new Error(`open: a selector or a non-empty array of selectors, got ${JSON.stringify(open)}`);
  return steps;
}

/** Clicks every `open` step in order; each step waits for its element (a lazy dialog may still be loading). */
export async function runOpen(page, open) {
  for (const selector of openSteps(open)) {
    const el = page.locator(selector).first();
    await el.waitFor({ state: "visible" });
    await el.click();
  }
}

/** Validates `crop` (positive integer px) and returns it, or null when the target is not cropped. */
export function cropHeight(crop) {
  if (crop === undefined) return null;
  if (!Number.isInteger(crop) || crop <= 0) throw new Error(`crop must be a positive integer (px), got ${JSON.stringify(crop)}`);
  return crop;
}

/** Texts (boxes relative to the target) that lie entirely inside the top `height` px; all when height is null. */
export function textsInCrop(texts, height) {
  return height === null ? texts : texts.filter((t) => t.y + t.h <= height + 0.5);
}

/** Top `height` rows of an RGBA image ({ width, height, data }); the image itself when it is not taller. */
export function cropImageTop(img, height) {
  if (height === null || img.height <= height) return img;
  const bytes = img.width * 4 * height;
  return { ...img, height, data: Buffer.from(img.data.subarray(0, bytes)) };
}

/** Validates `refOffset` ([x, y] non-negative integers) → { x, y }; { x: 0, y: 0 } when absent. */
export function refOffset(offset) {
  if (offset === undefined) return { x: 0, y: 0 };
  if (!Array.isArray(offset) || offset.length !== 2 || offset.some((v) => !Number.isInteger(v) || v < 0)) {
    throw new Error(`refOffset must be [x, y] (non-negative integers), got ${JSON.stringify(offset)}`);
  }
  return { x: offset[0], y: offset[1] };
}

/** The `width` × `height` region at (x, y) of an RGBA image; the image itself for the full region. */
export function cropImage(img, { x, y, width, height }) {
  if (x === 0 && y === 0 && width === img.width && height === img.height) return img;
  if (x + width > img.width || y + height > img.height) throw new Error(`crop ${width}x${height}+${x}+${y} is outside the ${img.width}x${img.height} image`);
  const data = Buffer.alloc(width * height * 4);
  for (let r = 0; r < height; r++) img.data.copy(data, r * width * 4, ((y + r) * img.width + x) * 4, ((y + r) * img.width + x + width) * 4);
  return { ...img, width, height, data };
}

/** VISUAL_ONLY="catalog,mobile/filter-" runs only the targets whose "<bp>/<name>" contains one of the parts. */
export function selectTargets(targets, only) {
  const parts = (only ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length ? targets.filter((t) => parts.some((p) => `${t.bp}/${t.name}`.includes(p))) : targets;
}
