// The proxy's product check (R2): a product URL with a wrong slug part answers with a real 301 to the canonical URL.
// One primary-key lookup per product request, never longer than the timeout: a slow or failing database means
// "no redirect" (the page still renders and names the canonical URL), it never holds a request.
import { db } from "@/db";
import { findProductSlug } from "@/features/factory/factory-sql";
import { canonicalProductPath, parseProductPath } from "@/features/factory/product-path";

const TIMEOUT_MS = 1_500;

/** The canonical public path of a product URL (given as the internal route), or null: canonical already, unknown, or no answer in time. */
export async function productRedirectFor(internal: string): Promise<string | null> {
  const parsed = parseProductPath(internal);
  if (!parsed) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const slug = await Promise.race([
      findProductSlug(db, parsed.factorySlug, parsed.code),
      new Promise<null>((resolve) => (timer = setTimeout(() => resolve(null), TIMEOUT_MS))),
    ]);
    return slug === null ? null : canonicalProductPath(parsed, slug);
  } catch (error) {
    console.error("products: could not check the product slug", error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
