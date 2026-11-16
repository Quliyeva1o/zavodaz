import "server-only";
import { revalidateTag, updateTag } from "next/cache";
import { db } from "@/db";
import { recordTagInvalidations } from "./tag-store";

export { CONTACT_TAG, FAQ_TAG, pageTag, SETTINGS_TAG, TARIFFS_TAG } from "./tag-store";

/**
 * Invalidates cache tags in this process (Next.js) and records them in the database, so
 * the other app processes and any process started later drop the same cached pages
 * (see ./tag-sync.ts). Use this instead of calling updateTag / revalidateTag directly.
 *
 * `mode: "action"` (server actions) expires at once, so the editor's next read is fresh;
 * `mode: "route"` (route handlers, where updateTag is not allowed) serves stale while refreshing.
 */
export async function invalidateTags(tags: Iterable<string>, mode: "action" | "route" = "action") {
  const list = [...new Set(tags)];
  if (list.length === 0) return;
  for (const tag of list) {
    if (mode === "action") updateTag(tag);
    else revalidateTag(tag, "max");
  }
  try {
    await recordTagInvalidations(db, list);
  } catch (error) {
    // The local invalidation already happened; other processes catch up on their next restart.
    console.error("cache tags: could not record invalidation", error);
  }
}
