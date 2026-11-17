export type StarFill = "full" | "half" | "empty";

/** Five stars; the rating is rounded to a quarter: <.25 empty, .25–.74 half, ≥.75 full. */
export function starFills(rating: number): StarFill[] {
  const r = Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0;
  return Array.from({ length: 5 }, (_, i) => {
    const frac = r - i;
    return frac >= 0.75 ? "full" : frac >= 0.25 ? "half" : "empty";
  });
}
