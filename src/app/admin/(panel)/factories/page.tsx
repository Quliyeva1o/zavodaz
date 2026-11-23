import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/features/contact/submissions";
import { FACTORY_TYPES, isFactoryType } from "@/features/catalog/types";
import { FACTORY_STATUSES, type FactoryStatus } from "@/features/factories/admin";
import { ADMIN_PAGE_SIZE, listFactoriesAdmin } from "@/features/factories/admin-db";
import { STATUS_LABELS, TARIFF_LABELS, TYPE_LABELS } from "./labels";

const input = "h-10 rounded-[4px] border border-gray-200 bg-white px-3 text-body-md focus:border-brand-700 focus:outline-none";
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
const isStatus = (v: string): v is FactoryStatus => (FACTORY_STATUSES as readonly string[]).includes(v);

export default async function FactoriesAdminPage({ searchParams }: PageProps<"/admin/factories">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 120);
  const type = isFactoryType(one(sp.type)) ? (one(sp.type) as (typeof FACTORY_TYPES)[number]) : null;
  const status = isStatus(one(sp.status)) ? (one(sp.status) as FactoryStatus) : null;
  const page = /^[1-9]\d{0,5}$/.test(one(sp.page)) ? Number(one(sp.page)) : 1;
  const { rows, total } = await listFactoriesAdmin({ q, type, status, page });
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const href = (p: number) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (type) qs.set("type", type);
    if (status) qs.set("status", status);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/admin/factories?${s}` : "/admin/factories";
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-h4">Zavodlar</h1>
        <Link href="/admin/factories/new" className="flex h-10 items-center rounded-[4px] bg-brand-950 px-6 text-body-md text-white">
          Yeni zavod
        </Link>
      </div>
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-body-sm">
          Ad üzrə axtarış
          <input type="search" name="q" defaultValue={q} maxLength={120} className={`${input} w-72`} />
        </label>
        <label className="flex flex-col gap-1.5 text-body-sm">
          Tip
          <select name="type" defaultValue={type ?? ""} className={input}>
            <option value="">Hamısı</option>
            {FACTORY_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-body-sm">
          Status
          <select name="status" defaultValue={status ?? ""} className={input}>
            <option value="">Hamısı</option>
            {FACTORY_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-10 rounded-[4px] bg-brand-950 px-6 text-body-md text-white">Axtar</button>
        {(q || type || status) && <Link href="/admin/factories" className="flex h-10 items-center px-2 text-body-md underline">Sıfırla</Link>}
      </form>
      <p className="mb-2 text-body-sm text-gray-500">Cəmi: {total}</p>
      <table className="w-full overflow-hidden rounded-[10px] bg-white text-left text-body-md">
        <thead className="bg-gray-50 text-body-sm text-gray-500">
          <tr>
            {["Ad", "Tip", "Şəhər", "Status", "Təsdiq", "Tarif", "Yenilənib"].map((h) => (
              <th key={h} className="px-4 py-3 font-normal">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-gray-500">Zavod tapılmadı.</td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-gray-100">
              <td className="px-4 py-3">
                <Link href={`/admin/factories/${r.id}`} className="underline">{r.name}</Link>
              </td>
              <td className="px-4 py-3">{TYPE_LABELS[r.type]}</td>
              <td className="px-4 py-3">{r.city ?? "—"}</td>
              <td className="px-4 py-3">{STATUS_LABELS[r.status]}</td>
              <td className="px-4 py-3">{r.verified ? "Təsdiqlənib" : "—"}</td>
              <td className="px-4 py-3">{TARIFF_LABELS[r.tariffCode as keyof typeof TARIFF_LABELS] ?? r.tariffCode}</td>
              <td className="px-4 py-3 text-body-sm">{formatDateTime(r.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {pageCount > 1 && (
        <nav aria-label="Səhifələmə" className="mt-4 flex items-center gap-4 text-body-md">
          {page > 1 && <Link href={href(page - 1)} className="underline">Əvvəlki 50</Link>}
          <span className="text-gray-500">{page} / {pageCount}</span>
          {page < pageCount && <Link href={href(page + 1)} className="underline">Növbəti 50</Link>}
        </nav>
      )}
    </>
  );
}
