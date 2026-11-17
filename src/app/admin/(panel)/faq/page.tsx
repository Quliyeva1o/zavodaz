import { asc } from "drizzle-orm";
import { db } from "@/db";
import { faqItems } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { FaqAdmin } from "./faq-form";

export default async function FaqAdminPage() {
  await requireAdmin();
  const items = await db
    .select({ id: faqItems.id, question: faqItems.question, answer: faqItems.answer, published: faqItems.published })
    .from(faqItems)
    .orderBy(asc(faqItems.sort), asc(faqItems.createdAt));
  return (
    <>
      <h1 className="mb-6 text-h4">Yardım (FAQ)</h1>
      <FaqAdmin items={items} />
    </>
  );
}
