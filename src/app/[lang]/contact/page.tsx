import type { Metadata } from "next";
import { pick, type Locale } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { href } from "@/i18n/routes";
import { getPage } from "@/features/pages/queries";
import { getContactSettings } from "@/features/contact/queries";
import { staticPageMetadata } from "@/lib/seo";
import { PageShell } from "@/components/page/page-shell";
import { ContactInfo } from "@/components/contact/contact-info";
import { ContactForm } from "@/components/contact/contact-form";

export async function generateMetadata({ params }: PageProps<"/[lang]/contact">): Promise<Metadata> {
  return staticPageMetadata("contact", (await params).lang as Locale);
}

/**
 * Figma 153:4374 (desktop): left column 617 (title + intro, gap 16, contact list, WhatsApp), right column 605
 * (form) aligned to the bottom, columns spread over 1320. Mobile 692:19212: title, intro, form, contact list.
 */
export default async function ContactPage({ params }: PageProps<"/[lang]/contact">) {
  const lang = (await params).lang as Locale;
  const [page, settings] = await Promise.all([getPage("contact"), getContactSettings()]);
  const title = pick(page.title, lang);
  const intro = pick(page.intro, lang);
  const topics = settings.topics.map((tp) => ({ value: tp.id, label: pick(tp.label, lang) }));
  return (
    <PageShell lang={lang} title={title} currentPath={href("contact", lang)} figma="contact" heading={false}>
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,617px)_minmax(0,605px)] lg:justify-between lg:gap-x-0">
        <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
          <h1 className="text-mob-h2 text-brand-950 lg:text-h2">{title}</h1>
          {intro && <p className="text-body-md text-gray-700">{intro}</p>}
        </div>
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-end">
          <ContactForm lang={lang} topics={topics} t={dict(lang).contact} homeHref={href("home", lang)} />
        </div>
        <div className="mt-4 lg:col-start-1 lg:row-start-2 lg:mt-0">
          <ContactInfo lang={lang} />
        </div>
      </div>
    </PageShell>
  );
}
