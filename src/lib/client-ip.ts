import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

/**
 * Visitor IP, hashed (never stored raw). On cPanel / LiteSpeed only the last X-Forwarded-For
 * entry is added by our server (CLIENT_IP_FROM=last-forwarded); earlier entries can be forged.
 */
export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const forwarded = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ip =
    (process.env.CLIENT_IP_FROM === "last-forwarded" ? forwarded.at(-1) : forwarded[0]) ?? h.get("x-real-ip") ?? "unknown";
  return createHash("sha256").update(`${process.env.IP_HASH_SALT ?? ""}:${ip}`).digest("hex").slice(0, 32);
}
