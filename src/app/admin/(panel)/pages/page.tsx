import Link from "next/link";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { defaultPages } from "@/features/pages/defaults";
import { PAGE_KEYS } from "@/features/pages/types";

export default async function PagesAdminPage() {
  await requireAdmin();
  const rows = await db.select({ key: pages.key, updatedAt: pages.updatedAt }).from(pages);
  const updated = new Map(rows.map((r) => [r.key, r.updatedAt]));
  return (
    <>
      <h1 className="mb-6 text-h4">Səhifələr</h1>
      <table className="w-full max-w-3xl overflow-hidden rounded-[10px] bg-white text-left text-body-md">
        <thead className="bg-gray-50 text-body-sm text-gray-500">
          <tr>
            <th className="px-4 py-3 font-normal">Səhifə</th>
            <th className="px-4 py-3 font-normal">Son yenilənmə</th>
          </tr>
        </thead>
        <tbody>
          {PAGE_KEYS.map((key) => {
            const at = updated.get(key);
            return (
              <tr key={key} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <Link href={`/admin/pages/${key}`} className="underline">
                    {defaultPages[key].title.az}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500">{at ? at.toLocaleString("az-AZ", { timeZone: "Asia/Baku" }) : "Hələ dəyişdirilməyib"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
