import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { unreadCount } from "@/features/contact/submissions";
import { logout } from "../actions";

const MENU = [
  { label: "Dashboard", href: "/admin" },
  { label: "Zavodlar", href: "/admin/factories" },
  { label: "Lüğətlər", href: "/admin/dictionaries" },
  { label: "Sayt ayarları", href: "/admin/settings" },
  { label: "Səhifələr", href: "/admin/pages" },
  { label: "FAQ (Yardım)", href: "/admin/faq" },
  { label: "Tariflər", href: "/admin/tariffs" },
  { label: "Əlaqə ayarları", href: "/admin/contact" },
  { label: "Müraciətlər", href: "/admin/submissions" },
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
  const unread = await unreadCount();
  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-60 shrink-0 flex-col gap-1 bg-brand-950 p-4 text-white">
        <p className="mb-4 text-subtitle-2s-semibold">Zavod.az admin</p>
        <nav className="flex flex-col gap-1">
          {MENU.map((m) => (
            <Link key={m.href} href={m.href} className="rounded-[4px] px-3 py-2 hover:bg-brand-900">
              {m.label}
              {m.href === "/admin/submissions" && unread > 0 && (
                <span aria-label={`${unread} oxunmamış`} className="ml-2 rounded-full bg-white px-2 py-0.5 text-caption text-brand-950">
                  {unread}
                </span>
              )}
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
