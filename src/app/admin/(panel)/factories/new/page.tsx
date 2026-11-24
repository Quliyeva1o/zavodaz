import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { EMPTY_FACTORY } from "@/features/factories/admin";
import { dictOptions } from "@/features/factories/admin-db";
import { FactoryForm } from "../factory-form";

export default async function NewFactoryPage() {
  await requireAdmin();
  const options = await dictOptions();
  return (
    <>
      <Link href="/admin/factories" className="text-body-sm text-gray-500 underline">← Zavodlar</Link>
      <h1 className="mt-2 mb-6 text-h4">Yeni zavod</h1>
      <FactoryForm id={null} initial={EMPTY_FACTORY} cover={null} options={options} saved={false} />
    </>
  );
}
