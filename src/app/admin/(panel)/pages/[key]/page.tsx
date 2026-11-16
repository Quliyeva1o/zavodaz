import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { defaultPages } from "@/features/pages/defaults";
import { PAGE_KEYS, type PageContent, type PageKey } from "@/features/pages/types";
import { PageForm } from "./page-form";

export default async function EditPage({ params }: PageProps<"/admin/pages/[key]">) {
  await requireAdmin();
  const { key } = await params;
  if (!PAGE_KEYS.includes(key as PageKey)) notFound();
  const pageKey = key as PageKey;
  // Admin reads straight from the database (no cache), falling back to the seeded Figma texts.
  const [row] = await db.select().from(pages).where(eq(pages.key, pageKey)).limit(1);
  const page: PageContent = row ? { ...row, key: pageKey } : defaultPages[pageKey];
  return (
    <>
      <h1 className="mb-6 text-h4">{defaultPages[pageKey].title.az}</h1>
      <PageForm page={page} defaultBody={defaultPages[pageKey].body.az} />
    </>
  );
}
