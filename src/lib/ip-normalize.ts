import { isIPv6 } from "node:net";

/** The eight 16-bit groups of an IPv6 address (an embedded IPv4 tail counts as two groups), or null when it does not parse. */
function groups(ip: string): number[] | null {
  let text = ip;
  const tail = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(text);
  if (tail) {
    const [a, b, c, d] = tail.slice(1).map(Number);
    if ([a, b, c, d].some((n) => n > 255)) return null;
    text = `${text.slice(0, tail.index)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, rest, ...extra] = text.split("::");
  if (extra.length) return null;
  const part = (s: string) => (s === "" ? [] : s.split(":"));
  const left = part(head);
  const right = rest === undefined ? [] : part(rest);
  const missing = 8 - left.length - right.length;
  if (rest === undefined ? missing !== 0 : missing < 1) return null;
  const all = [...left, ...Array<string>(rest === undefined ? 0 : missing).fill("0"), ...right].map((g) => parseInt(g, 16));
  return all.length === 8 && all.every((n) => Number.isInteger(n) && n >= 0 && n <= 0xffff) ? all : null;
}

/**
 * The key an IP is limited by. IPv4 stays as it is. IPv6 collapses to its /64 prefix (one subscriber owns a whole /64,
 * so single addresses are free to rotate): "2001:db8:1:2:aaaa::1" → "2001:db8:1:2::/64". An IPv4-mapped IPv6
 * (::ffff:1.2.3.4) is the IPv4 address. Anything that does not parse is returned unchanged.
 */
export function normalizeIp(raw: string): string {
  const ip = raw.trim().replace(/%.*$/, "");
  if (!isIPv6(ip)) return raw;
  const g = groups(ip);
  if (!g) return raw;
  if (g.slice(0, 5).every((n) => n === 0) && g[5] === 0xffff) return `${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`;
  return `${g.slice(0, 4).map((n) => n.toString(16)).join(":")}::/64`;
}
