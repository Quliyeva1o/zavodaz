import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { factoryToRaw } from "@/features/factories/admin";
import { dictOptions, getFactoryForEdit } from "@/features/factories/admin-db";
import { FactoryForm } from "../factory-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function EditFactoryPage({ params, searchParams }: PageProps<"/admin/factories/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [found, options, sp] = await Promise.all([getFactoryForEdit(id), dictOptions(), searchParams]);
  if (!found) notFound();
  return (
    <>
      <Link href="/admin/factories" className="text-body-sm text-gray-500 underline">← Zavodlar</Link>
      <h1 className="mt-2 mb-6 text-h4">{found.factory.name}</h1>
      <FactoryForm id={id} initial={factoryToRaw(found.factory)} cover={found.cover} options={options} saved={sp.saved === "1"} />
    </>
  );
}
