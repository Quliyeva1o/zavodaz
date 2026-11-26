import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { pdfSrc } from "@/features/media/url";
import { getFactoryHead, listFilesAdmin } from "@/features/factory/admin-content-db";
import { addCatalogFile, deleteCatalogFile } from "../actions";
import { DeleteForm, FactoryAdminHeader, formatBytes } from "../parts";
import { UploadForm } from "../upload-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function FactoryFilesPage({ params }: PageProps<"/admin/factories/[id]/files">) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [head, items] = await Promise.all([getFactoryHead(id), listFilesAdmin(id)]);
  if (!head) notFound();
  return (
    <>
      <FactoryAdminHeader head={head} current="files" />
      <div className="flex max-w-5xl flex-col gap-6">
        {items.length === 0 ? (
          <p className="text-body-sm text-gray-500">PDF kataloq yoxdur.</p>
        ) : (
          <ul className="flex max-w-xl flex-col gap-3">
            {items.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-4 rounded-[10px] bg-white p-4">
                <a href={pdfSrc(f.mediaId)} target="_blank" rel="noopener" className="text-body-md text-brand-700 underline">
                  {f.title}
                </a>
                <span className="text-body-sm text-gray-500">{formatBytes(f.size)}</span>
                <DeleteForm action={deleteCatalogFile} hidden={{ id: f.id, factoryId: id }} label={`Sil: ${f.title}`} />
              </li>
            ))}
          </ul>
        )}
        <UploadForm action={addCatalogFile} hidden={{ factoryId: id }} kind="pdf" titleLabel="Kataloqun adı" fileLabel="PDF faylı" submitLabel="Kataloq əlavə et" />
      </div>
    </>
  );
}
