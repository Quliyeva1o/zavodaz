import type { Metadata } from "next";
import { pick, type Locale } from "@/i18n/config";
import { href } from "@/i18n/routes";
import { getPage } from "@/features/pages/queries";
import { getFaq } from "@/features/faq/queries";
import { staticPageMetadata } from "@/lib/seo";
import { JsonLd, faqJsonLd } from "@/lib/structured-data";
import { PageShell } from "@/components/page/page-shell";
import { LegalNav } from "@/components/page/legal-nav";
import { FaqList } from "@/components/faq/faq-list";

export async function generateMetadata({ params }: PageProps<"/[lang]/help">): Promise<Metadata> {
  return staticPageMetadata("help", (await params).lang as Locale);
}

export default async function HelpPage({ params }: PageProps<"/[lang]/help">) {
  const lang = (await params).lang as Locale;
  const [page, faq] = await Promise.all([getPage("help"), getFaq()]);
  const items = faq.map((q) => ({ id: q.id, question: pick(q.question, lang), answer: pick(q.answer, lang) }));
  return (
    <PageShell lang={lang} title={pick(page.title, lang)} currentPath={href("help", lang)} figma="help"
      aside={<LegalNav lang={lang} active="help" gap={20} />}
    >
      {items.length > 0 && <JsonLd data={faqJsonLd(items)} />}
      <FaqList items={items} />
    </PageShell>
  );
}
