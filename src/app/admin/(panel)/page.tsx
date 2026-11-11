import Link from "next/link";

export default function DashboardPage() {
  return (
    <>
      <h1 className="mb-6 text-h4">Dashboard</h1>
      <p className="text-body-md">
        Hazırda yalnız <Link href="/admin/settings" className="underline">sayt ayarları</Link> mövcuddur. Digər bölmələr
        növbəti addımlarda əlavə olunacaq.
      </p>
    </>
  );
}
