import type { Metadata } from "next";
import { inter } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = { title: "Admin — Zavod.az", robots: { index: false, follow: false } };

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="az" className={inter.variable}>
      <body className="min-h-dvh bg-gray-50 text-body-sm text-brand-950">{children}</body>
    </html>
  );
}
