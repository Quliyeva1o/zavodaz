import type { Metadata } from "next";
import { pick, type Locale } from "@/i18n/config";
import { href } from "@/i18n/routes";
import { getPage } from "@/features/pages/queries";
import { staticPageMetadata } from "@/lib/seo";
import { RichText } from "@/lib/rich-text";
import { PageShell } from "@/components/page/page-shell";
import { LegalNav } from "@/components/page/legal-nav";

export async function generateMetadata({ params }: PageProps<"/[lang]/terms">): Promise<Metadata> {
  return staticPageMetadata("terms", (await params).lang as Locale);
}

export default async function TermsPage({ params }: PageProps<"/[lang]/terms">) {
  const lang = (await params).lang as Locale;
  const page = await getPage("terms");
  const body = page.body[lang]?.content?.length ? page.body[lang] : page.body.az;
  return (
    <PageShell lang={lang} title={pick(page.title, lang)} currentPath={href("terms", lang)} figma="terms"
      aside={<LegalNav lang={lang} active="terms" gap={16} />}
    >
      <RichText doc={body} />
    </PageShell>
  );
}
