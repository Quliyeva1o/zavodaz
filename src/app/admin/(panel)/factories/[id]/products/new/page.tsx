import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getFactoryHead } from "@/features/factory/admin-content-db";
import { FactoryAdminHeader } from "../../parts";
import { ProductForm } from "../product-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function NewProductPage({ params }: PageProps<"/admin/factories/[id]/products/new">) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const head = await getFactoryHead(id);
  if (!head) notFound();
  return (
    <>
      <FactoryAdminHeader head={head} current="products" />
      <Link href={`/admin/factories/${id}/products`} className="mb-4 inline-block text-body-sm text-gray-500 underline">← Məhsullar</Link>
      <h2 className="mb-4 text-h5">Yeni məhsul</h2>
      <ProductForm factoryId={id} productId={null} initial={{ name: "", description: "", status: "draft" }} saved={false} />
      <p className="mt-4 text-body-sm text-gray-500">Şəkilləri məhsulu yadda saxladıqdan sonra əlavə edə bilərsiniz.</p>
    </>
  );
}
