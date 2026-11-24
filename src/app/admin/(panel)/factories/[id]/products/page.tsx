import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/features/contact/submissions";
import { getFactoryHead, listProductsAdmin } from "@/features/factory/admin-content-db";
import { mediaSrc } from "@/features/media/url";
import { STATUS_LABELS } from "../../labels";
import { FactoryAdminHeader } from "../parts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function FactoryProductsPage({ params, searchParams }: PageProps<"/admin/factories/[id]/products">) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [head, items, sp] = await Promise.all([getFactoryHead(id), listProductsAdmin(id), searchParams]);
  if (!head) notFound();
  return (
    <>
      <FactoryAdminHeader head={head} current="products" />
      <div className="flex max-w-5xl flex-col gap-4">
        {sp.deleted === "1" && <p role="status" className="text-body-sm text-green-600">Məhsul silindi</p>}
        <div>
          <Link href={`/admin/factories/${id}/products/new`} className="inline-flex h-10 items-center rounded-[4px] bg-brand-950 px-6 text-body-md text-white">
            Yeni məhsul
          </Link>
        </div>
        {items.length === 0 ? (
          <p className="text-body-sm text-gray-500">Məhsul yoxdur.</p>
        ) : (
          <table className="w-full overflow-hidden rounded-[10px] bg-white text-left text-body-md">
            <thead className="text-body-sm text-gray-500">
              <tr>
                <th className="p-3">Şəkil</th>
                <th className="p-3">Kod</th>
                <th className="p-3">Ad</th>
                <th className="p-3">Status</th>
                <th className="p-3">Yenilənib</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="p-3">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- admin preview of an already resized variant
                      <img src={mediaSrc(p.image, 320)} alt="" width={64} height={48} className="h-12 w-16 rounded-[4px] object-cover" />
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="p-3">{p.id}</td>
                  <td className="p-3">
                    <Link href={`/admin/factories/${id}/products/${p.id}`} className="underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="p-3">{STATUS_LABELS[p.status]}</td>
                  <td className="p-3">{formatDateTime(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
