import type { Metadata } from "next";
import { pick, type Locale } from "@/i18n/config";
import { href } from "@/i18n/routes";
import { getPage } from "@/features/pages/queries";
import { getTariffs } from "@/features/tariffs/queries";
import { staticPageMetadata } from "@/lib/seo";
import { PageShell } from "@/components/page/page-shell";
import { TariffCard } from "@/components/tariffs/tariff-card";

export async function generateMetadata({ params }: PageProps<"/[lang]/tariffs">): Promise<Metadata> {
  return staticPageMetadata("tariffs", (await params).lang as Locale);
}

export default async function TariffsPage({ params }: PageProps<"/[lang]/tariffs">) {
  const lang = (await params).lang as Locale;
  const [page, plans] = await Promise.all([getPage("tariffs"), getTariffs()]);
  return (
    <PageShell lang={lang} title={pick(page.title, lang)} intro={pick(page.intro, lang)} currentPath={href("tariffs", lang)} figma="tariffs">
      <div className="-mt-2 flex flex-col gap-5 lg:mt-4 lg:flex-row">
        {plans.map((p) => (
          <TariffCard key={p.code} plan={p} lang={lang} joinHref={`/api/join?plan=${p.code}&lang=${lang}`} />
        ))}
      </div>
    </PageShell>
  );
}
