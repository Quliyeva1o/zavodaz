import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { factoryToRaw } from "@/features/factories/admin";
import { dictOptions, getFactoryForEdit } from "@/features/factories/admin-db";
import { FactoryForm } from "../factory-form";
import { FactoryAdminHeader } from "./parts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function EditFactoryPage({ params, searchParams }: PageProps<"/admin/factories/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [found, options, sp] = await Promise.all([getFactoryForEdit(id), dictOptions(), searchParams]);
  if (!found) notFound();
  return (
    <>
      <FactoryAdminHeader head={{ id, name: found.factory.name, slug: found.factory.slug, status: found.factory.status }} current="main" />
      <FactoryForm id={id} initial={factoryToRaw(found.factory)} cover={found.cover} logo={found.logo} options={options} saved={sp.saved === "1"} />
    </>
  );
}
