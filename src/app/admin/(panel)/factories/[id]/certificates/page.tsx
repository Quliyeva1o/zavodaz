import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { mediaSrc } from "@/features/media/url";
import { getFactoryHead, listCertificatesAdmin } from "@/features/factory/admin-content-db";
import { addCertificate, deleteCertificate } from "../actions";
import { DeleteForm, FactoryAdminHeader } from "../parts";
import { UploadForm } from "../upload-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function FactoryCertificatesPage({ params }: PageProps<"/admin/factories/[id]/certificates">) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [head, items] = await Promise.all([getFactoryHead(id), listCertificatesAdmin(id)]);
  if (!head) notFound();
  return (
    <>
      <FactoryAdminHeader head={head} current="certificates" />
      <div className="flex max-w-5xl flex-col gap-6">
        {items.length === 0 ? (
          <p className="text-body-sm text-gray-500">Sertifikat yoxdur.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-4">
            {items.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 rounded-[10px] bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an already resized variant */}
                <img src={mediaSrc({ id: c.mediaId, variants: c.variants }, 320)} alt={c.title} className="aspect-[3/4] w-full rounded-[4px] object-cover" />
                <p className="text-body-md">{c.title}</p>
                <DeleteForm action={deleteCertificate} hidden={{ id: c.id }} label={`Sil: ${c.title}`} />
              </li>
            ))}
          </ul>
        )}
        <UploadForm action={addCertificate} hidden={{ factoryId: id }} kind="image" titleLabel="Sertifikatın adı" fileLabel="Sertifikat şəkli" submitLabel="Sertifikat əlavə et" />
      </div>
    </>
  );
}
