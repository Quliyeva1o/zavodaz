"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { DICTIONARIES_TAG, FACTORIES_TAG, invalidateTags, REDIRECTS_TAG } from "@/lib/cache/tags";
import { DICT_KINDS, dictRawFromForm, isDictKind, parseDictEntry, type DictRaw } from "@/features/catalog/dict-admin";
import { DICT_TABLES, deleteUnusedDictEntry, LANDING_PEER, usageCount } from "@/features/catalog/dict-admin-db";
import { recordLandingSlugChange } from "@/features/factory/slug-redirect";

export type DictState = { ok?: boolean; error?: string; errors?: Record<string, string>; values?: DictRaw } | undefined;

const ID = /^[1-9]\d{0,9}$/;
const isUniqueViolation = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";

class SlugTaken extends Error {}

export async function saveDictEntry(_prev: DictState, form: FormData): Promise<DictState> {
  await requireAdmin();
  const values = dictRawFromForm(form);
  const kind = String(form.get("kind") ?? "");
  const idRaw = String(form.get("id") ?? "");
  if (!isDictKind(kind) || (idRaw !== "" && !ID.test(idRaw))) return { error: "Naməlum lüğət", values };
  const id = idRaw === "" ? null : Number(idRaw);
  const parsed = parseDictEntry(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const { slug, name, sort } = parsed.data;
  const table = DICT_TABLES[kind];
  const peer = LANDING_PEER[kind];
  let renamed = false;

  try {
    const result = await db.transaction(async (tx) => {
      // Cities and industries share one landing slug space: serialise their writes so two saves cannot race.
      if (peer) await tx.execute(sql`select pg_advisory_xact_lock(hashtext('dict-landing-slugs'))`);
      const sameSlug = await tx
        .select({ id: table.id })
        .from(table)
        .where(id === null ? eq(table.slug, slug) : and(eq(table.slug, slug), ne(table.id, id)))
        .limit(1);
      if (sameSlug.length > 0) throw new SlugTaken("Bu slug bu lüğətdə artıq var");
      if (peer) {
        const peerTable = DICT_TABLES[peer];
        const clash = await tx.select({ id: peerTable.id }).from(peerTable).where(eq(peerTable.slug, slug)).limit(1);
        if (clash.length > 0) throw new SlugTaken(`Bu slug „${DICT_KINDS[peer].plural}“ lüğətində var (landing ünvanı toqquşur)`);
      }
      if (id === null) {
        await tx.insert(table).values({ slug, name, sort });
        return "ok" as const;
      }
      const [before] = await tx.select({ slug: table.slug }).from(table).where(eq(table.id, id)).for("update");
      if (!before) return "missing" as const;
      await tx.update(table).set({ slug, name, sort }).where(eq(table.id, id));
      // A city or industry slug is a landing URL (`/fabrikler/<slug>`): the old one redirects (step-2 R19).
      if (peer && before.slug !== slug) {
        await recordLandingSlugChange(tx, before.slug, slug);
        return "renamed" as const;
      }
      return "ok" as const;
    });
    if (result === "missing") return { error: "Dəyər tapılmadı", values };
    renamed = result === "renamed";
  } catch (e) {
    if (e instanceof SlugTaken) return { errors: { slug: e.message }, values };
    if (isUniqueViolation(e)) return { errors: { slug: "Bu slug bu lüğətdə artıq var" }, values };
    throw e;
  }

  await invalidateTags(renamed ? [DICTIONARIES_TAG, FACTORIES_TAG, REDIRECTS_TAG] : [DICTIONARIES_TAG, FACTORIES_TAG]);
  return { ok: true, values };
}

export async function deleteDictEntry(kind: string, id: number): Promise<{ error?: string }> {
  await requireAdmin();
  if (!isDictKind(kind) || !Number.isSafeInteger(id) || id <= 0) return { error: "Naməlum lüğət" };
  if (await deleteUnusedDictEntry(kind, id)) {
    await invalidateTags([DICTIONARIES_TAG, FACTORIES_TAG]);
    return {};
  }
  const used = await usageCount(kind, id);
  return { error: used > 0 ? `Bu dəyər ${used} zavodda istifadə olunur` : "Dəyər tapılmadı" };
}
