import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";

const TITLE: Record<Locale, string> = {
  az: "Zavod.az — Azərbaycanın sənaye platforması",
  en: "Zavod.az — Industrial platform of Azerbaijan",
  ru: "Zavod.az — Промышленная платформа Азербайджана",
};

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return pageMetadata({ route: "home", lang, title: TITLE[lang] });
}

export default function HomePage() {
  return <main className="container-site min-h-[400px]" />;
}
