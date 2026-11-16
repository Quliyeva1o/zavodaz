import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";

const MENU = [
  { label: "Dashboard", href: "/admin" },
  { label: "Sayt ayarları", href: "/admin/settings" },
  { label: "Səhifələr", href: "/admin/pages" },
  { label: "FAQ (Yardım)", href: "/admin/faq" },
];

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<div className="p-8">Yüklənir…</div>}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

/** Reads the session cookie at request time; redirects to login when signed out. */
async function Gate({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-60 shrink-0 flex-col gap-1 bg-brand-950 p-4 text-white">
        <p className="mb-4 text-subtitle-2s-semibold">Zavod.az admin</p>
        <nav className="flex flex-col gap-1">
          {MENU.map((m) => (
            <Link key={m.href} href={m.href} className="rounded-[4px] px-3 py-2 hover:bg-brand-900">
              {m.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="mt-auto">
          <p className="mb-2 truncate text-caption text-gray-300">{user.email}</p>
          <button type="submit" className="w-full rounded-[4px] px-3 py-2 text-left hover:bg-brand-900">
            Çıxış
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
