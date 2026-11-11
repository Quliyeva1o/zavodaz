import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, locales } from "@/i18n/config";
import { inter } from "@/lib/fonts";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FigmaOverlay } from "@/components/dev/figma-overlay";
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
  return (
    <html lang={lang} className={inter.variable}>
      <body className="flex min-h-dvh flex-col">
        <Header lang={lang} />
        <div className="flex-1">{children}</div>
        <Footer lang={lang} />
        {process.env.NODE_ENV === "development" && <FigmaOverlay />}
      </body>
    </html>
  );
}
