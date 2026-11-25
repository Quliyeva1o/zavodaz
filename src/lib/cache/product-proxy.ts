// The proxy's product check (R2): a product URL with a wrong slug part answers with a real 301 to the canonical URL.
// One primary-key lookup per cache miss, never longer than the timeout: a slow or failing database means
// "no redirect" (the page still renders and names the canonical URL), it never holds a request.
import { tagsManifest } from "next/dist/server/lib/incremental-cache/tags-manifest.external";
import { db } from "@/db";
import { findProductSlug } from "@/features/factory/factory-sql";
import { canonicalProductPath, parseProductPath } from "@/features/factory/product-path";
import { ProductSlugCache, productSlugFor } from "@/features/factory/product-slug-cache";
import { FACTORIES_TAG, REDIRECTS_TAG } from "./tag-store";

const TIMEOUT_MS = 1_500;

// R9: positive cache (≤ 10 000 codes, 60 s), cleared whenever FACTORIES_TAG or REDIRECTS_TAG is invalidated (the same
// tag-version check as the redirect map). A canonical product view is a Map lookup; only a miss queries the database.
const cache = new ProductSlugCache({
  version: () => Math.max(tagsManifest.get(FACTORIES_TAG)?.expired ?? 0, tagsManifest.get(REDIRECTS_TAG)?.expired ?? 0),
});

/** The canonical public path of a product URL (given as the internal route), or null: canonical already, unknown, or no answer in time. */
export async function productRedirectFor(internal: string): Promise<string | null> {
  const parsed = parseProductPath(internal);
  if (!parsed) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const slug = await productSlugFor(cache, parsed.factorySlug, parsed.code, () =>
      Promise.race([
        findProductSlug(db, parsed.factorySlug, parsed.code),
        new Promise<null>((resolve) => (timer = setTimeout(() => resolve(null), TIMEOUT_MS))),
      ]),
    );
    return slug === null ? null : canonicalProductPath(parsed, slug);
  } catch (error) {
    console.error("products: could not check the product slug", error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
