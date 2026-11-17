// Idempotent seed of the static content: pages, tariff plans, FAQ, contact settings, filter dictionaries.
// Existing rows are never overwritten (admin edits win). Texts are the literal Figma texts.
import { count } from "drizzle-orm";
import { faqItems, pages, siteSettings, tariffPlans } from "../../src/db/schema";
import { defaultContactSettings } from "../../src/features/contact/settings";
import { defaultPages } from "../../src/features/pages/defaults";
import { PAGE_KEYS } from "../../src/features/pages/types";
import { CONTACT_TAG, FAQ_TAG, pageTag, recordTagInvalidations, TARIFFS_TAG, type AnyPgDb } from "../../src/lib/cache/tag-store";
import { seedDictionariesIn } from "./dictionaries-seed";

const loc = (az: string) => ({ az, en: "", ru: "" });
const feats = (az: string[]) => ({ az, en: [] as string[], ru: [] as string[] });

const TARIFF_PLANS = [
  {
    code: "standart",
    icon: "asterisk",
    name: loc("Standart"),
    priceMonthQ: 0,
    priceYearQ: null,
    limits: { products: 1, vacancies: 1 },
    features: feats(["Profil yaratmaq və əsas məlumatları yerləşdirmək", "1 Vakansiya paylaşmaq", "1 Məhsul yerləşdirmək"]),
    sort: 0,
  },
  {
    code: "premium",
    icon: "diamonds-four",
    name: loc("Premium"),
    priceMonthQ: 799,
    priceYearQ: 8600,
    limits: { products: 50, vacancies: 3 },
    features: feats([
      "Zavod profilinin SEO optimizasiyası",
      "3 Vakansiya paylaşmaq",
      "1 Məqalə yazdırmaq",
      "Ana səhifədə “Tövsiyyə edilən zavodlar” bölməsinə əlavə olunmaq.",
      "Podkast (ildə 1 dəfə)",
      "50 Məhsul yerləşdirmək",
    ]),
    sort: 1,
  },
  {
    code: "vip",
    icon: "crown-simple",
    name: loc("VİP"),
    priceMonthQ: 999,
    priceYearQ: null,
    limits: { products: 200, vacancies: null },
    features: feats([
      "Zavod profilinin tam SEO optimizasiyası və Google reklamlarına çıxış",
      "Limitsiz vakansiya paylaşımı",
      "3 Məqalə yazdırmaq",
      "Ana səhifədə xüsusi banner reklam yeri",
      "Xəbərlər bölməsində zavod haqqında xüsusi reportaj",
      "Podkast (ildə 2 dəfə)",
      "200 Məhsul yerləşdirmək",
    ]),
    sort: 2,
  },
];

const FAQ_QUESTION = "Lorem ipsum dolor sit amet, consectetur adipiscing elit?";
const FAQ_ANSWER = "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo  natus error sit voluptatem accusantium doloremqu. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.";

/**
 * Inserts the missing content rows in one transaction and, in the same transaction, records
 * the cache tags of whatever was inserted (cache_tags, like invalidateTags), so a running or
 * later-started app process never keeps serving a page cached from the empty table.
 * Returns the invalidated tags (empty when the database was already seeded).
 */
export async function seedContent(db: AnyPgDb): Promise<string[]> {
  return db.transaction(async (tx) => {
    const tags: string[] = [];

    const insertedPages = await tx
      .insert(pages)
      .values(PAGE_KEYS.map((key) => ({ key, title: defaultPages[key].title, intro: defaultPages[key].intro, body: defaultPages[key].body, seo: defaultPages[key].seo })))
      .onConflictDoNothing()
      .returning({ key: pages.key });
    tags.push(...insertedPages.map(({ key }) => pageTag(key)));

    const insertedPlans = await tx.insert(tariffPlans).values(TARIFF_PLANS).onConflictDoNothing().returning({ code: tariffPlans.code });
    if (insertedPlans.length > 0) tags.push(TARIFFS_TAG);

    const [{ n: faqCount }] = await tx.select({ n: count() }).from(faqItems);
    if (faqCount === 0) {
      await tx.insert(faqItems).values(Array.from({ length: 6 }, (_, sort) => ({ question: loc(FAQ_QUESTION), answer: loc(FAQ_ANSWER), sort, published: true })));
      tags.push(FAQ_TAG);
    }

    const insertedSettings = await tx
      .insert(siteSettings)
      .values({ key: "contact", value: defaultContactSettings })
      .onConflictDoNothing()
      .returning({ key: siteSettings.key });
    if (insertedSettings.length > 0) tags.push(CONTACT_TAG);

    tags.push(...(await seedDictionariesIn(tx)));

    await recordTagInvalidations(tx, tags);
    return tags;
  });
}
