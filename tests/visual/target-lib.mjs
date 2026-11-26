// Pure helpers shared by capture.mjs, geometry.mjs and compare.mjs for target options (unit-tested):
//   open: a selector or an array of selectors clicked one after another (e.g. the mobile "Filtr" button, then a row);
//   crop: only the top N px of the target are checked (a Figma frame taller than what the site shows the same way,
//         e.g. the mobile catalog list: 8 Figma cards vs 15 per page — title, "Filtr" button and the first card);
//   refOffset: [x, y] of the target's box inside the Figma export, when the export is larger than the node because
//         children's effects overflow it (the mobile cards' drop shadow: 24px each side);
//   union: more Figma nodes after `node` — the target is their common box (a site element whose Figma
//         counterpart is several sibling frames, e.g. the factory tab content under the tab bar);
//   patterns: { figmaText: regex } — the site text must match the regex instead (a sample value Figma repeats
//         where the site shows unique ones, e.g. the 7-digit product code);
//   cookies: { name: value } set before the page loads (a fixed rating voter, so re-runs update one vote);
//   videoStill: an image file answering the YouTube preview request (videoStillLayout), as Figma's own video still.

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

/** VISUAL_ONLY="catalog,mobile/filter-" runs only the targets whose "<bp>/<name>" contains one of the parts; none matching is an error. */
export function selectTargets(targets, only) {
  const parts = (only ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return targets;
  const picked = targets.filter((t) => parts.some((p) => `${t.bp}/${t.name}`.includes(p)));
  if (!picked.length) throw new Error(`VISUAL_ONLY="${only}" matches no target`);
  return picked;
}

/** Figma node ids of a target: `node`, then `union` in order. */
export function targetNodes(t) {
  return [t.node, ...(t.union ?? [])];
}

/** Common box of { x, y, width, height } boxes. */
export function unionBox(boxes) {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  const bottom = Math.max(...boxes.map((b) => b.y + b.height));
  return { x, y, width: right - x, height: bottom - y };
}

/**
 * Where a node's export lies in its top frame's 1x PNG: position rounded, size rounded up like Figma's own export
 * (and geometry.mjs) — the reference is cut from the frame PNG when the /images API is not available.
 */
export function referenceRect(frame, box) {
  return {
    x: Math.round(box.x - frame.x),
    y: Math.round(box.y - frame.y),
    width: Math.ceil(box.width - 1e-3),
    height: Math.ceil(box.height - 1e-3),
  };
}

/** The region of an RGBA image; pixels outside the image are transparent (a node 1px past the frame edge). */
export function cropRegion(img, { x, y, width, height }) {
  const data = Buffer.alloc(width * height * 4);
  for (let r = 0; r < height; r++) {
    const sy = y + r;
    if (sy < 0 || sy >= img.height) continue;
    const from = Math.max(0, x);
    const to = Math.min(img.width, x + width);
    if (to <= from) continue;
    img.data.copy(data, (r * width + (from - x)) * 4, (sy * img.width + from) * 4, (sy * img.width + to) * 4);
  }
  return { width, height, data };
}

/** Options that narrow or reinterpret what is checked must say why (crop, refOffset, relayout, union, patterns). Throws on the first violation. */
export function validateTarget(t) {
  const id = `${t.bp}/${t.name}`;
  if (t.union !== undefined) {
    const ok = Array.isArray(t.union) && t.union.length > 0 && t.union.every((n) => typeof n === "string" && n && n !== t.node) && new Set(t.union).size === t.union.length;
    if (!ok) throw new Error(`${id}: union must be a non-empty list of other node ids, got ${JSON.stringify(t.union)}`);
    if (!t.unionReason) throw new Error(`${id}: union requires unionReason`);
  }
  if (t.patterns !== undefined) {
    if (!t.patternReason) throw new Error(`${id}: patterns requires patternReason`);
    for (const [k, v] of Object.entries(t.patterns)) {
      try {
        new RegExp(v);
      } catch {
        throw new Error(`${id}: patterns["${k}"] is not a valid regex: ${v}`);
      }
    }
  }
  if (t.videoStill !== undefined && !t.videoStillReason) throw new Error(`${id}: videoStill requires videoStillReason`);
  if (t.cookies !== undefined) {
    const ok = t.cookies && typeof t.cookies === "object" && !Array.isArray(t.cookies) && Object.values(t.cookies).every((v) => typeof v === "string");
    if (!ok) throw new Error(`${id}: cookies must be { name: "value" }, got ${JSON.stringify(t.cookies)}`);
  }
  if (t.crop !== undefined) {
    cropHeight(t.crop);
    if (!t.cropReason) throw new Error(`${id}: crop requires cropReason`);
  }
  if (t.refOffset !== undefined) {
    refOffset(t.refOffset);
    if (!t.refOffsetReason) throw new Error(`${id}: refOffset requires refOffsetReason`);
  }
  if (t.relayout !== undefined) {
    if (t.relayout !== true) throw new Error(`${id}: relayout must be true when set`);
    if (!t.relayoutReason) throw new Error(`${id}: relayout requires relayoutReason`);
  }
  openSteps(t.open);
}

/**
 * All targets validated, then the VISUAL_ONLY selection. A partial run prints a banner (`log`), so a green
 * partial result is never mistaken for the full check.
 */
export function loadTargets(all, only, log = console.log) {
  for (const t of all) validateTarget(t);
  const picked = selectTargets(all, only);
  if (picked.length !== all.length) log(`*** PARTIAL RUN: VISUAL_ONLY="${only}" — ${picked.length} of ${all.length} targets ***`);
  return picked;
}

/** Geometry size under `crop`: the site element must be at least `crop` high (else the crop hides a short page). */
export function cropSizeError(crop, siteHeight) {
  return crop !== null && siteHeight < crop ? `site element is ${siteHeight}px high, shorter than crop ${crop}px` : null;
}

/** Sets the target's cookies on the page's context (before navigation). */
export async function setCookies(page, cookies, base) {
  if (!cookies) return;
  await page.context().addCookies(Object.entries(cookies).map(([name, value]) => ({ name, value, url: base })));
}

/** YouTube's hqdefault preview: 480×360. VideoFacade shows it object-cover in its box, scaled 125% (VideoFacade). */
export const YT_STILL = { width: 480, height: 360, scale: 1.25 };

/**
 * `videoStill`: the site's video preview is YouTube's own image (i.ytimg.com), Figma shows a still of its own (FILL).
 * For the check the preview request is answered with that still drawn into a 480×360 canvas so that the part the site
 * shows (object-cover into the box, then 125%) is exactly Figma's FILL crop. Returns where the still goes on the canvas.
 */
export function videoStillLayout(box, still) {
  if (!(box.width > 0 && box.height > 0)) throw new Error(`videoStill: bad box ${JSON.stringify(box)}`);
  const s = Math.max(box.width / YT_STILL.width, box.height / YT_STILL.height);
  const vw = box.width / s / YT_STILL.scale;
  const vh = box.height / s / YT_STILL.scale;
  const k = Math.max(vw / still.width, vh / still.height);
  const width = Math.round(still.width * k);
  const height = Math.round(still.height * k);
  return { left: Math.round((YT_STILL.width - width) / 2), top: Math.round((YT_STILL.height - height) / 2), width, height };
}
