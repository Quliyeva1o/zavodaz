/** 799 → "7.99₼", 8600 → "86₼" (Figma style: no space before ₼, no trailing ".00"). */
export function formatPrice(qepik: number): string {
  const manat = qepik / 100;
  return `${Number.isInteger(manat) ? manat : manat.toFixed(2)}₼`;
}
