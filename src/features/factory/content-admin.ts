// Admin rules for the factory page content (step 3): YouTube link, social links, products, titles, reordering.
// Pure (zod only, no server imports): shared by the actions, the factory form schema and the unit tests.
import { z } from "zod";
import { slugify } from "@/features/catalog/slug";
import { SOCIALS, type SocialKey } from "@/features/settings/links";

export const MAX_FACTORY_IMAGES = 6;
export const MAX_PRODUCT_IMAGES = 6;
export const MAX_PRODUCT_DESCRIPTION = 400;
export const CONTENT_STATUSES = ["draft", "published", "hidden"] as const;

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

/** Video id of a youtube.com / youtu.be link (watch, embed, shorts, live), or null for anything else. */
export function youtubeVideoId(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const parts = url.pathname.split("/").filter(Boolean);
  let id: string | null | undefined = null;
  if (url.hostname === "youtu.be") id = parts[0];
  else if (YOUTUBE_HOSTS.has(url.hostname)) {
    if (parts[0] === "watch") id = url.searchParams.get("v");
    else if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") id = parts[1];
  }
  return id && VIDEO_ID.test(id) ? id : null;
}

/** Stored form of a YouTube link. */
export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

const optionalText = (max: number) =>
  z
    .string()
    .default("")
    .transform((s) => s.trim())
    .pipe(z.string().max(max, `Ən çox ${max} simvol`));

const multiline = (max: number) =>
  z
    .string()
    .default("")
    .transform((s) => s.replace(/\r\n/g, "\n").trim())
    .pipe(z.string().max(max, `Ən çox ${max} simvol`));

const webUrl = (message: string) =>
  z
    .string()
    .default("")
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .max(200, "Ən çox 200 simvol")
        .refine((s) => {
          if (s === "") return true;
          try {
            const u = new URL(s);
            return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
          } catch {
            return false;
          }
        }, message),
    );

const emptySocials = () => Object.fromEntries(SOCIALS.map((k) => [k, ""])) as Record<SocialKey, string>;

/** The contact / content fields of the factory form (added to the step-2 schema). */
export const factoryContentShape = {
  legalName: optionalText(160),
  equipmentText: multiline(4000),
  employeeCount: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : typeof v === "string" ? Number(v.trim()) : v),
    z.number({ error: "Yanlış say" }).int("Yanlış say").min(1, "Yanlış say").max(1_000_000, "Yanlış say").nullable(),
  ),
  capacityText: optionalText(200),
  phone: optionalText(40).refine((s) => s === "" || /^[0-9+()\-.\s]+$/.test(s), "Telefon formatı yanlışdır"),
  email: optionalText(120).refine((s) => s === "" || z.email().safeParse(s).success, "E-poçt formatı yanlışdır"),
  website: webUrl("https:// ilə başlayan sayt ünvanı yazın"),
  address: optionalText(200),
  youtubeUrl: z
    .string()
    .default("")
    .transform((s, ctx) => {
      const v = s.trim();
      if (v === "") return "";
      const id = youtubeVideoId(v);
      if (!id) {
        ctx.addIssue({ code: "custom", message: "Yalnız youtube.com və ya youtu.be linki" });
        return z.NEVER;
      }
      return youtubeWatchUrl(id);
    }),
  socials: z
    .object(Object.fromEntries(SOCIALS.map((k) => [k, webUrl("https:// ilə başlayan link yazın")])) as Record<SocialKey, ReturnType<typeof webUrl>>)
    .default(emptySocials)
    .transform((s) => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== "")) as Partial<Record<SocialKey, string>>),
};

// ---------- Products ----------

export const productFormSchema = z
  .object({
    name: z.string({ error: "Ad məcburidir" }).trim().min(2, "Ən azı 2 simvol").max(120, "Ən çox 120 simvol"),
    description: z
      .string()
      .default("")
      .transform((s) => s.replace(/\r\n/g, "\n").trim())
      .pipe(z.string().max(MAX_PRODUCT_DESCRIPTION, `Ən çox ${MAX_PRODUCT_DESCRIPTION} simvol`)),
    status: z.enum(CONTENT_STATUSES, { error: "Statusu seçin" }).default("draft"),
  })
  .transform((d) => ({ ...d, slug: slugify(d.name).slice(0, 80).replace(/-+$/, "") || "mehsul" }));

export type ProductRaw = { name: string; description: string; status: string };

export function parseProduct(raw: ProductRaw): { ok: true; data: z.output<typeof productFormSchema> } | { ok: false; errors: Record<string, string> } {
  const r = productFormSchema.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  const errors: Record<string, string> = {};
  for (const i of r.error.issues) errors[String(i.path[0] ?? "form")] ??= i.message;
  return { ok: false, errors };
}

/** Certificate and PDF catalogue titles. */
export function parseTitle(raw: string): { ok: true; title: string } | { ok: false; error: string } {
  const title = raw.trim();
  if (title === "") return { ok: false, error: "Başlıq məcburidir" };
  if (title.length > 120) return { ok: false, error: "Ən çox 120 simvol" };
  return { ok: true, title };
}

/** `ids` with `id` swapped with its neighbour; unchanged at the ends or when `id` is not in the list. */
export function moveItem<T>(ids: readonly T[], id: T, dir: "up" | "down"): T[] {
  const list = [...ids];
  const i = list.indexOf(id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return list;
  [list[i], list[j]] = [list[j], list[i]];
  return list;
}
