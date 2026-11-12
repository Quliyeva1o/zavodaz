// Idempotent seed of the static content: pages, tariff plans, FAQ, contact settings.
// Existing rows are never overwritten (admin edits win). Texts are the literal Figma texts.
import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { faqItems, pages, siteSettings, tariffPlans } from "../../src/db/schema";
import { defaultContactSettings } from "../../src/features/contact/settings";
import { defaultPages } from "../../src/features/pages/defaults";
import { PAGE_KEYS } from "../../src/features/pages/types";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);

const loc = (az: string) => ({ az, en: "", ru: "" });
const feats = (az: string[]) => ({ az, en: [] as string[], ru: [] as string[] });

await db
  .insert(pages)
  .values(PAGE_KEYS.map((key) => ({ key, title: defaultPages[key].title, intro: defaultPages[key].intro, body: defaultPages[key].body, seo: defaultPages[key].seo })))
  .onConflictDoNothing();

await db
  .insert(tariffPlans)
  .values([
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
  ])
  .onConflictDoNothing();

const FAQ_QUESTION = "Lorem ipsum dolor sit amet, consectetur adipiscing elit?";
const FAQ_ANSWER = "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo  natus error sit voluptatem accusantium doloremqu. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.";
const [{ n: faqCount }] = await db.select({ n: count() }).from(faqItems);
if (faqCount === 0) {
  await db.insert(faqItems).values(Array.from({ length: 6 }, (_, sort) => ({ question: loc(FAQ_QUESTION), answer: loc(FAQ_ANSWER), sort, published: true })));
}

await db.insert(siteSettings).values({ key: "contact", value: defaultContactSettings }).onConflictDoNothing();

const [p] = await db.select({ n: count() }).from(pages);
const [t] = await db.select({ n: count() }).from(tariffPlans);
const [f] = await db.select({ n: count() }).from(faqItems);
const [s] = await db.select({ n: count() }).from(siteSettings);
console.log(`Content ready: pages=${p.n} tariff_plans=${t.n} faq_items=${f.n} site_settings=${s.n}`);
await client.end();
