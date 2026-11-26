import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getFactoryHead, listFactoryGallery } from "@/features/factory/admin-content-db";
import { MAX_FACTORY_IMAGES } from "@/features/factory/content-admin";
import { addFactoryImage, deleteFactoryImage, moveFactoryImage } from "../actions";
import { FactoryAdminHeader, GalleryList } from "../parts";
import { UploadForm } from "../upload-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function FactoryImagesPage({ params }: PageProps<"/admin/factories/[id]/images">) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [head, items] = await Promise.all([getFactoryHead(id), listFactoryGallery(id)]);
  if (!head) notFound();
  return (
    <>
      <FactoryAdminHeader head={head} current="images" />
      <div className="flex max-w-5xl flex-col gap-6">
        <GalleryList items={items} hidden={{ factoryId: id }} onMove={moveFactoryImage} onDelete={deleteFactoryImage} max={MAX_FACTORY_IMAGES} />
        {items.length < MAX_FACTORY_IMAGES ? (
          <UploadForm action={addFactoryImage} hidden={{ factoryId: id }} kind="image" fileLabel="Yeni şəkil" submitLabel="Şəkil əlavə et" />
        ) : (
          <p className="text-body-sm text-gray-500">Ən çox {MAX_FACTORY_IMAGES} şəkil olar. Yenisini əlavə etmək üçün birini silin.</p>
        )}
      </div>
    </>
  );
}
