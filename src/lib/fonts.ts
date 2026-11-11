import { Inter } from "next/font/google";

/**
 * Inter (the only font in the Figma file), self-hosted by next/font — no request to Google
 * at runtime. latin + latin-ext (Azerbaijani letters) are preloaded; cyrillic is still
 * available for Russian pages through unicode-range.
 */
export const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});
