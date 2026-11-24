import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { DICT_KINDS, isDictKind } from "@/features/catalog/dict-admin";
import { listDictWithUsage } from "@/features/catalog/dict-admin-db";
import { DictAdmin } from "../dict-form";

export default async function DictionaryAdminPage({ params }: PageProps<"/admin/dictionaries/[dict]">) {
  await requireAdmin();
  const { dict } = await params;
  if (!isDictKind(dict)) notFound();
  const rows = await listDictWithUsage(dict);
  const nextSort = rows.reduce((top, r) => Math.max(top, r.sort), -1) + 1;
  return (
    <>
      <Link href="/admin/dictionaries" className="text-body-sm text-gray-500 underline">
        ← Lüğətlər
      </Link>
      <h1 className="mt-2 mb-2 text-h4">{DICT_KINDS[dict].plural}</h1>
      <p className="mb-6 text-body-sm text-gray-500">
        Saytda sıra ilə göstərilir. Slug-ı dəyişmək köhnə URL-ləri (landing, filtr linkləri) qırır. Zavodun istifadə etdiyi dəyər silinmir.
      </p>
      <DictAdmin kind={dict} title={DICT_KINDS[dict].title} rows={rows} nextSort={nextSort} />
    </>
  );
}
