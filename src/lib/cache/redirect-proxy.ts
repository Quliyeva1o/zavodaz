// The proxy's redirect map (R2): old slug paths answer with a real HTTP 301 before any page streams.
// Next keeps tag invalidations in this module-level Map (see ./tag-sync.ts); it is an external module, so the proxy
// reads the same instance the server updates — locally (updateTag in an admin action) and from other processes
// (tag sync every 3 s).
import { tagsManifest } from "next/dist/server/lib/incremental-cache/tags-manifest.external";
import { db } from "@/db";
import { redirects } from "@/db/schema";
import { RedirectMapCache } from "@/features/factory/redirect-map";
import { REDIRECTS_TAG } from "./tag-store";

const cache = new RedirectMapCache({
  load: async () => {
    const rows = await db.select({ from: redirects.fromPath, to: redirects.toPath }).from(redirects);
    return rows.map((r): [string, string] => [r.from, r.to]);
  },
  version: () => tagsManifest.get(REDIRECTS_TAG)?.expired ?? 0,
});

/** Where an old public path lives now, or null. One Map lookup per path segment; the table is reloaded only when changed. */
export const redirectFor = (path: string): Promise<string | null> => cache.lookup(path);
