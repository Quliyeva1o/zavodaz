export type PageItem = number | "gap";

/**
 * Figma "1 2 3 … 10": first and last always, the current page with one neighbour each side; a one-page hole is shown as a number.
 * `compact` (mobile, Figma 736:24508 "1 2 … 10" in 288px): first, current and last only (plus page 2 / count−1 on the
 * first / last page, as Figma) — at most 5 items, 7 cells with the arrows, which fit 288 (7 × 40).
 */
export function pageItems(current: number, count: number, compact = false): PageItem[] {
  if (count <= 1) return [1];
  const cur = Math.min(Math.max(1, current), count);
  const shown = new Set<number>(compact ? [1, count, cur] : [1, count, cur - 1, cur, cur + 1]);
  if (compact) {
    if (cur === 1) shown.add(2);
    if (cur === count) shown.add(count - 1);
  } else {
    // Figma's first/last states keep three numbers next to the edge: 1 2 3 … / … 8 9 10.
    if (cur === 1) shown.add(3);
    if (cur === 2) shown.add(3);
    if (cur === count) shown.add(count - 2);
    if (cur === count - 1) shown.add(count - 2);
  }
  const nums = [...shown].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b);
  const out: PageItem[] = [];
  for (let i = 0; i < nums.length; i++) {
    const gap = i > 0 ? nums[i] - nums[i - 1] : 1;
    if (gap === 2) out.push(nums[i] - 1); // "1 … 3" would hide a single page: show it
    else if (gap > 2) out.push("gap");
    out.push(nums[i]);
  }
  return out;
}
