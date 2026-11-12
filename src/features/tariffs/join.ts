import type { Locale } from "@/i18n/config";
import { cabinetPath, href } from "@/i18n/routes";

export const KNOWN_DEVICE_COOKIE = "zv_known";
const PLANS = new Set(["standart", "premium", "vip"]);

/** Where "İndi qoşul" leads (user decision 2026-11-12). Pure, so it is unit-tested. */
export function joinTarget(o: { lang: Locale; plan: string; role: "factory" | "admin" | null; knownDevice: boolean }): string {
  const plan = PLANS.has(o.plan) ? o.plan : null;
  const q = plan ? `?plan=${plan}` : "";
  const cabinet = cabinetPath("tariffs", o.lang) + q;
  if (o.role === "factory") return cabinet;
  if (o.knownDevice) return `${href("login", o.lang)}?next=${encodeURIComponent(cabinet)}`;
  return href("register", o.lang) + q;
}
