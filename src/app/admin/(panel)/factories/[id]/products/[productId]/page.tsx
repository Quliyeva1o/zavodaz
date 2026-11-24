import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getFactoryHead, getProductForEdit, listProductGallery } from "@/features/factory/admin-content-db";
import { MAX_PRODUCT_IMAGES } from "@/features/factory/content-admin";
import { addProductImage, deleteProduct, deleteProductImage, moveProductImage } from "../../actions";
import { DeleteForm, FactoryAdminHeader, GalleryList } from "../../parts";
import { UploadForm } from "../../upload-form";
import { ProductForm } from "../product-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/factories/[id]/products/[productId]">) {
  await requireAdmin();
  const { id, productId } = await params;
  if (!UUID.test(id) || !/^[1-9]\d{0,15}$/.test(productId)) notFound();
  const code = Number(productId);
  const [head, product, items, sp] = await Promise.all([getFactoryHead(id), getProductForEdit(id, code), listProductGallery(code), searchParams]);
  if (!head || !product) notFound();
  const hidden = { factoryId: id, productId: String(code) };
  return (
    <>
      <FactoryAdminHeader head={head} current="products" />
      <Link href={`/admin/factories/${id}/products`} className="mb-4 inline-block text-body-sm text-gray-500 underline">← Məhsullar</Link>
      <h2 className="mb-4 text-h5">
        {product.name} <span className="text-body-md text-gray-500">(kod {product.id})</span>
      </h2>
      <div className="flex max-w-5xl flex-col gap-6">
        <ProductForm factoryId={id} productId={code} initial={{ name: product.name, description: product.description, status: product.status }} saved={sp.saved === "1"} />
        <GalleryList items={items} hidden={hidden} onMove={moveProductImage} onDelete={deleteProductImage} max={MAX_PRODUCT_IMAGES} />
        {items.length < MAX_PRODUCT_IMAGES ? (
          <UploadForm action={addProductImage} hidden={hidden} kind="image" fileLabel="Yeni şəkil" submitLabel="Şəkil əlavə et" />
        ) : (
          <p className="text-body-sm text-gray-500">Ən çox {MAX_PRODUCT_IMAGES} şəkil olar. Yenisini əlavə etmək üçün birini silin.</p>
        )}
        <div>
          <DeleteForm action={deleteProduct} hidden={hidden} label="Məhsulu sil" />
        </div>
      </div>
    </>
  );
}
