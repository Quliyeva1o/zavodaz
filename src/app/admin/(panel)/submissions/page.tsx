import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, listSubmissions } from "@/features/contact/submissions";
import { SubmissionsTable } from "./submissions-table";

export default async function SubmissionsPage({ searchParams }: PageProps<"/admin/submissions">) {
  await requireAdmin();
  const { before } = await searchParams;
  const { rows, nextCursor } = await listSubmissions(typeof before === "string" ? before : undefined);
  const items = rows.map((r) => ({
    id: r.id,
    date: formatDateTime(r.createdAt),
    name: `${r.firstName} ${r.lastName}`,
    email: r.email,
    phone: r.phone,
    topic: r.topicLabel,
    lang: r.lang.toUpperCase(),
    message: r.message,
    read: r.readAt !== null,
  }));
  return (
    <>
      <h1 className="mb-6 text-h4">Müraciətlər</h1>
      <SubmissionsTable items={items} />
      <div className="mt-4 flex gap-4 text-body-md">
        {before && <Link href="/admin/submissions" className="underline">Ən yenilərə qayıt</Link>}
        {nextCursor && (
          <Link href={`/admin/submissions?before=${encodeURIComponent(nextCursor)}`} className="underline">
            Növbəti 50
          </Link>
        )}
      </div>
    </>
  );
}
