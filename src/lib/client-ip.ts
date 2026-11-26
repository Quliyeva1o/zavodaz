import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { ipHashSalt as salt } from "@/lib/env";
import { normalizeIp } from "@/lib/ip-normalize";

/**
 * Visitor IP, hashed (never stored raw). The LAST X-Forwarded-For entry is the one our own
 * server (cPanel / LiteSpeed) appended; earlier entries can be forged by the client, so they are
 * not trusted. IPv6 is reduced to its /64 prefix first (ip-normalize.ts). Set CLIENT_IP_FROM=first-forwarded only behind a proxy that overwrites the header.
 */
export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const forwarded = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ip =
    (process.env.CLIENT_IP_FROM === "first-forwarded" ? forwarded[0] : forwarded.at(-1)) ?? h.get("x-real-ip") ?? "unknown";
  return createHash("sha256").update(`${salt}:${normalizeIp(ip)}`).digest("hex").slice(0, 32);
}
