import Link from "next/link";
import { factoryHref } from "@/i18n/routes";
import { mediaSrc, type MediaRef } from "@/features/media/url";

export type FactoryHead = { id: string; name: string; slug: string; status: string };
export type Section = "main" | "images" | "certificates" | "files" | "products";

const SECTIONS: { key: Section; label: string; path: string }[] = [
  { key: "main", label: "Əsas məlumat", path: "" },
  { key: "images", label: "Şəkillər", path: "/images" },
  { key: "certificates", label: "Sertifikatlar", path: "/certificates" },
  { key: "files", label: "PDF kataloqlar", path: "/files" },
  { key: "products", label: "Məhsullar", path: "/products" },
];

/** Back link, title, the section tabs (plain links: they work without JavaScript) and the preview link. */
export function FactoryAdminHeader({ head, current }: { head: FactoryHead; current: Section }) {
  return (
    <>
      <Link href="/admin/factories" className="text-body-sm text-gray-500 underline">← Zavodlar</Link>
      <div className="mt-2 mb-4 flex items-center gap-4">
        <h1 className="text-h4">{head.name}</h1>
        {/* The public page checks the admin session itself; ?preview=1 shows draft and hidden factories (never cached). */}
        <a href={`${factoryHref(head.slug, "az")}?preview=1`} target="_blank" rel="noopener" className="text-body-sm text-brand-700 underline">
          Önizlə
        </a>
      </div>
      <nav aria-label="Zavod bölmələri" className="mb-6 flex gap-2 border-b border-gray-200">
        {SECTIONS.map((s) => (
          <Link
            key={s.key}
            href={`/admin/factories/${head.id}${s.path}`}
            aria-current={s.key === current ? "page" : undefined}
            className={`px-4 py-2 text-body-md ${s.key === current ? "border-b-2 border-brand-950 text-brand-950" : "text-gray-500 hover:text-brand-950"}`}
          >
            {s.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

const small = "h-8 rounded-[4px] border border-gray-200 px-3 text-body-sm hover:bg-gray-100 disabled:opacity-40";

function Hidden({ fields }: { fields: Record<string, string> }) {
  return Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />);
}

/** Photos with up / down / delete buttons: plain forms, so reordering works without JavaScript. */
export function GalleryList({
  items,
  hidden,
  onMove,
  onDelete,
  max,
}: {
  items: MediaRef[];
  hidden: Record<string, string>;
  onMove: (form: FormData) => Promise<void>;
  onDelete: (form: FormData) => Promise<void>;
  max: number;
}) {
  return (
    <section aria-label="Şəkillər" className="flex flex-col gap-3">
      <p className="text-body-sm text-gray-500">
        {items.length}/{max} şəkil. Birinci şəkil əsas şəkildir.
      </p>
      {items.length === 0 ? (
        <p className="text-body-sm text-gray-500">Şəkil yoxdur.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-4">
          {items.map((m, i) => (
            <li key={m.id} className="flex flex-col gap-2 rounded-[10px] bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an already resized variant */}
              <img src={mediaSrc(m, 320)} alt={`Şəkil ${i + 1}`} className="aspect-[4/3] w-full rounded-[4px] object-cover" />
              <div className="flex gap-2">
                {(
                  [
                    ["up", "Yuxarı", i === 0],
                    ["down", "Aşağı", i === items.length - 1],
                  ] as const
                ).map(([dir, label, disabled]) => (
                  <form key={dir} action={onMove}>
                    <Hidden fields={{ ...hidden, mediaId: m.id, dir }} />
                    <button type="submit" disabled={disabled} aria-label={`Şəkil ${i + 1}: ${label.toLowerCase()}`} className={small}>
                      {label}
                    </button>
                  </form>
                ))}
                <form action={onDelete}>
                  <Hidden fields={{ ...hidden, mediaId: m.id }} />
                  <button type="submit" aria-label={`Şəkil ${i + 1}: sil`} className={`${small} text-red-700`}>
                    Sil
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DeleteForm({ action, hidden, label }: { action: (form: FormData) => Promise<void>; hidden: Record<string, string>; label: string }) {
  return (
    <form action={action}>
      <Hidden fields={hidden} />
      <button type="submit" aria-label={label} className={`${small} text-red-700`}>
        Sil
      </button>
    </form>
  );
}

export const formatBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
