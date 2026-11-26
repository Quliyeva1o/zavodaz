import { NextResponse, type NextRequest } from "next/server";
import { locales } from "@/i18n/config";
import { resolvePublicPath } from "@/i18n/routes";
import { productRedirectFor } from "@/lib/cache/product-proxy";
import { redirectFor } from "@/lib/cache/redirect-proxy";

// Internal routes whose slugs can be renamed: a factory (with its tabs and products) and a catalog landing.
const RENAMEABLE = new RegExp(`^/(?:${locales.join("|")})/(?:factory/|catalog/type/[^/]+/[^/]+$)`);

// Proxy runs on the Node.js runtime by default (Next 16), so it can read the database: the redirect map is one query
// per change (see lib/cache/redirect-proxy.ts), never one per request.
export async function proxy(request: NextRequest) {
  const resolved = resolvePublicPath(request.nextUrl.pathname);
  const url = request.nextUrl.clone();
  switch (resolved.kind) {
    case "redirect":
      url.pathname = resolved.to;
      return NextResponse.redirect(url, 308);
    case "rewrite": {
      // R2: a renamed slug answers with a real 301 (a page can only stream 200 + a client redirect with Cache Components).
      if (RENAMEABLE.test(resolved.internal)) {
        const to = await redirectFor(request.nextUrl.pathname);
        if (to) {
          url.pathname = to;
          return NextResponse.redirect(url, 301);
        }
        // A product URL whose slug part is not the product's current one → 301 to the canonical URL.
        const canonical = await productRedirectFor(resolved.internal);
        if (canonical) {
          url.pathname = canonical;
          return NextResponse.redirect(url, 301);
        }
      }
      url.pathname = resolved.internal;
      return NextResponse.rewrite(url);
    }
    case "notFound":
      // No such route: Next renders app/[lang]/not-found.tsx with status 404.
      url.pathname = `/${resolved.locale}/__not-found`;
      return NextResponse.rewrite(url);
  }
}

export const config = {
  // Site pages only: skip admin, API, Next internals and any file with an extension.
  matcher: ["/((?!(?:admin|api)(?:/|$)|_next/|.*\\..*).*)"],
};
