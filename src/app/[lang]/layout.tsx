import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, locales } from "@/i18n/config";
import { inter } from "@/lib/fonts";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { siteUrl } from "@/lib/seo";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
};

// Cache Components: params must be known at build time, otherwise the layout becomes request-time data.
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function SiteLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  // Dev only. A static import would put the overlay into the production client bundle (the client reference
  // exists even when the JSX is guarded); this branch is removed from the production build (R13).
  const FigmaOverlay = process.env.NODE_ENV === "development" ? (await import("@/components/dev/figma-overlay")).FigmaOverlay : null;
  return (
    <html lang={lang} className={inter.variable}>
      <body className="flex min-h-dvh flex-col">
        <Header lang={lang} />
        <div className="flex-1">{children}</div>
        <Footer lang={lang} />
        {FigmaOverlay && <FigmaOverlay />}
      </body>
    </html>
  );
}
