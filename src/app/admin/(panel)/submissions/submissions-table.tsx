"use client";

import { Fragment, useState, useTransition } from "react";
import { deleteSubmission, markRead } from "./actions";

type Item = { id: string; date: string; name: string; email: string; phone: string; topic: string; lang: string; message: string; read: boolean };

export function SubmissionsTable({ items }: { items: Item[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [goneIds, setGoneIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const visible = items.filter((i) => !goneIds.has(i.id));
  if (visible.length === 0) return <p className="text-body-md text-gray-500">Müraciət yoxdur.</p>;

  const toggle = (item: Item) => {
    setConfirmId(null);
    const opening = openId !== item.id;
    setOpenId(opening ? item.id : null);
    if (opening && !item.read && !readIds.has(item.id)) {
      setReadIds((p) => new Set(p).add(item.id));
      startTransition(() => void markRead(item.id));
    }
  };

  const remove = (id: string) => {
    setGoneIds((p) => new Set(p).add(id));
    setOpenId(null);
    setConfirmId(null);
    startTransition(() => void deleteSubmission(id));
  };

  const th = "px-4 py-3 text-left text-body-sm font-semibold";
  const td = "px-4 py-3 text-body-sm align-top";
  return (
    <div className="overflow-x-auto rounded-[10px] bg-white">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className={th}>Tarix</th>
            <th className={th}>Ad Soyad</th>
            <th className={th}>E-mail</th>
            <th className={th}>Telefon</th>
            <th className={th}>Mövzu</th>
            <th className={th}>Dil</th>
            <th className={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((i) => {
            const read = i.read || readIds.has(i.id);
            const open = openId === i.id;
            return (
              <Fragment key={i.id}>
                <tr onClick={() => toggle(i)} className={`cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${read ? "" : "font-semibold"}`}>
                  <td className={td}>{i.date}</td>
                  <td className={td}>
                    <button type="button" aria-expanded={open} className="text-left">
                      {i.name}
                    </button>
                  </td>
                  <td className={td}>{i.email}</td>
                  <td className={td}>{i.phone}</td>
                  <td className={td}>{i.topic}</td>
                  <td className={td}>{i.lang}</td>
                  <td className={td}>
                    <span className={`rounded-full px-2 py-0.5 text-caption ${read ? "bg-gray-100 text-gray-700" : "bg-brand-950 text-white"}`}>
                      {read ? "Oxunub" : "Yeni"}
                    </span>
                  </td>
                </tr>
                {open && (
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <td colSpan={7} className="px-4 py-4">
                      <p className="mb-4 max-w-3xl whitespace-pre-wrap break-words text-body-md">{i.message}</p>
                      {confirmId === i.id ? (
                        <div className="flex items-center gap-3 text-body-sm">
                          <span>Müraciət həmişəlik silinəcək.</span>
                          <button type="button" onClick={() => remove(i.id)} className="h-9 rounded-[4px] bg-red-700 px-4 text-white">
                            Bəli, sil
                          </button>
                          <button type="button" onClick={() => setConfirmId(null)} className="h-9 rounded-[4px] px-4 hover:bg-gray-100">
                            Ləğv et
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setConfirmId(i.id)} className="h-9 rounded-[4px] border border-gray-200 px-4 text-body-sm hover:bg-gray-100">
                          Sil
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
