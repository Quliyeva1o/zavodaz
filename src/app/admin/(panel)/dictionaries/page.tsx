import Link from "next/link";
import { count } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { DICT_KINDS, type DictKind } from "@/features/catalog/dict-admin";
import { DICT_TABLES } from "@/features/catalog/dict-admin-db";

export default async function DictionariesAdminPage() {
  await requireAdmin();
  const kinds = Object.keys(DICT_KINDS) as DictKind[];
  const counts = await Promise.all(kinds.map(async (k) => (await db.select({ n: count() }).from(DICT_TABLES[k]))[0].n));
  return (
    <>
      <h1 className="mb-2 text-h4">Lüğətlər</h1>
      <p className="mb-6 text-body-sm text-gray-500">Kataloq filtrlərinin dəyərləri. Slug bütün dillərdə eynidir və URL-də istifadə olunur.</p>
      <ul className="flex max-w-xl flex-col gap-2">
        {kinds.map((k, i) => (
          <li key={k}>
            <Link href={`/admin/dictionaries/${k}`} className="flex items-center justify-between rounded-[10px] bg-white px-5 py-4 text-body-md hover:bg-gray-50">
              {DICT_KINDS[k].plural}
              <span className="text-body-sm text-gray-500">{counts[i]} dəyər</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
