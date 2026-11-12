import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "@/i18n/config";
import { getSessionUser } from "@/lib/auth";
import { joinTarget, KNOWN_DEVICE_COOKIE } from "@/features/tariffs/join";

/** /api/join?plan=premium&lang=az → 303 to cabinet / login / registration (no indexing: /api is disallowed). */
export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang") ?? "az";
  const plan = request.nextUrl.searchParams.get("plan") ?? "";
  const user = await getSessionUser();
  const knownDevice = (await cookies()).get(KNOWN_DEVICE_COOKIE)?.value === "1";
  const to = joinTarget({ lang: hasLocale(lang) ? lang : "az", plan, role: user?.role ?? null, knownDevice });
  return NextResponse.redirect(new URL(to, request.url), 303);
}
