import type { Metadata } from "next";
import { pick, type Locale } from "@/i18n/config";
import { href } from "@/i18n/routes";
import { getPage } from "@/features/pages/queries";
import { staticPageMetadata } from "@/lib/seo";
import { RichText } from "@/lib/rich-text";
import { PageShell } from "@/components/page/page-shell";
import { LegalNav } from "@/components/page/legal-nav";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  return staticPageMetadata("privacy", (await params).lang as Locale);
}

export default async function PrivacyPage({ params }: PageProps<"/[lang]/privacy">) {
  const lang = (await params).lang as Locale;
  const page = await getPage("privacy");
  const body = page.body[lang]?.content?.length ? page.body[lang] : page.body.az;
  return (
    <PageShell lang={lang} title={pick(page.title, lang)} currentPath={href("privacy", lang)} figma="privacy">
      <div className="flex flex-col gap-[60px] lg:flex-row">
        <RichText doc={body} className="text-body-md text-gray-700 lg:w-[880px] lg:shrink-0" />
        <div className="lg:w-[380px] lg:shrink-0">
          <LegalNav lang={lang} active="privacy" gap={16} />
        </div>
      </div>
    </PageShell>
  );
}
