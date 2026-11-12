import { NextResponse, type NextRequest } from "next/server";
import { resolvePublicPath } from "@/i18n/routes";

export function proxy(request: NextRequest) {
  const resolved = resolvePublicPath(request.nextUrl.pathname);
  const url = request.nextUrl.clone();
  switch (resolved.kind) {
    case "redirect":
      url.pathname = resolved.to;
      return NextResponse.redirect(url, 308);
    case "rewrite":
      url.pathname = resolved.internal;
      return NextResponse.rewrite(url);
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
