// Yük seed-i üçün saf köməkçilər (DB-siz, unit-testlənir).

/** Yük seed-i yalnız `zavod_load` bazasında işləyir; başqa baza (məs. dev `zavod`) toxunulmaz qalır. */
export function assertLoadDb(url: string): void {
  let name = "";
  try {
    name = decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  } catch {
    // URL oxunmur: aşağıda rədd olunur (mesajda URL yoxdur, sirr sızmasın).
  }
  if (name !== "zavod_load") throw new Error("yük seed-i yalnız zavod_load bazasında işləyir");
}

/** URL-in baza adını dəyişir (sirr çap olunmur). */
export function withDatabase(url: string, name: string): string {
  const u = new URL(url);
  u.pathname = `/${name}`;
  return u.toString();
}

/** Deterministik RNG, [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
