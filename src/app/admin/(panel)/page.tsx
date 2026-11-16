import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, recentSubmissions } from "@/features/contact/submissions";

export default async function DashboardPage() {
  await requireAdmin();
  const recent = await recentSubmissions(5);
  return (
    <>
      <h1 className="mb-6 text-h4">Dashboard</h1>
      <section className="max-w-3xl rounded-[10px] bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-subtitle-2s-semibold">Son müraciətlər</h2>
          <Link href="/admin/submissions" className="text-body-sm underline">Hamısı</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-body-md text-gray-500">Hələ müraciət yoxdur.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-100">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 py-2 text-body-sm">
                <span className={r.readAt ? "" : "font-semibold"}>
                  {r.firstName} {r.lastName} · {r.topicLabel}
                </span>
                <span className="text-gray-500">{formatDateTime(r.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
