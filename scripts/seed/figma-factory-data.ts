// Zavod səhifəsinin Figma fixture-u (Tapşırıq 6b) üçün saf məlumat (DB-siz, unit-testlənir): "Agro Trade Supply",
// Figma desktop 312:11599 (Haqqında), 368:12413 (Media), 368:12095 (Məhsullar), 361:10709 (Texniki imkanlar),
// 357:10356 (Vakansiyalar), 382:11083 (Məhsul) və mobil 762:22809 … 770:24037. Mətnlər Figma-dakı kimidir.
// Şəkillər: Figma IMAGE fill-lərinin imageRef-i, design/manual-export/factory/<imageRef> (uzantısız).
import { slugify } from "../../src/features/catalog/slug";
import type { Cooperation, FactoryType } from "../../src/features/catalog/types";
import type { SocialKey } from "../../src/features/settings/links";

export const FACTORY_PHOTO_DIR = "design/manual-export/factory";

const IMG = {
  cover: "2738dc05d0b77a0a0558624e4ec711d05aa98bcc",
  logo: "ec0f4760a218cbc1dfa2e3f344d8ac7ee014fe11",
  aboutMain: "f0f28082c30df5a5ded42b748a44afead0f44751",
  mediaMain: "62fcfd5a8c1efecff83606df295b9fc97028b6de",
  t2: "11c14706a924dc17a140dcff279e5c20dababefa",
  t3: "9ddeaba894e6327add42721377a43ce819acf21d",
  t4: "3d545f16d1e13435454f1bd8e90b341c1febbfa6",
  t5: "bf2e67f21a91a248edb4383bacf23343ee613945",
  t6: "fc626aef856a7eb5ea127d933b726236177568d9",
  productCard: "fd23c5eb2c7bae5fc4103082a48e30f8e927a4fd",
  certPortrait: "289fea57c4cbe5add54878bb8e6dc538d37b21e0",
  certLandscape: "21bc61ca1c3be781b88fc8a207971313c4369551",
} as const;

/**
 * "Media" qalereyası. Figma-da böyük şəkil 1-ci miniatürün yüksək keyfiyyətli nüsxəsidir (62fcfd5a ≈ d13136ed), sayt da
 * birinci şəkli böyük göstərir. Haqqında önizləməsi (312:11599, mobil Media 773:24771 də) başqa sıradır: böyük f0f28082
 * və 4-cü miniatür 9ddeaba8 təkrar (desktop Media-da 3d545f16) — dizaynerin uyğunsuzluğu. Əsas zavod Haqqında sırasını
 * alır; desktop Media tabının hədəfi eyni məlumatlı ikinci zavodu (`-media`) Media sırası ilə göstərir.
 */
export const GALLERY_ABOUT: readonly string[] = [IMG.aboutMain, IMG.t2, IMG.t3, IMG.t3, IMG.t5, IMG.t6];
export const GALLERY_MEDIA: readonly string[] = [IMG.mediaMain, IMG.t2, IMG.t3, IMG.t4, IMG.t5, IMG.t6];

/**
 * 8 sertifikat (361:11001: 2 sıra × 4). Figma şəkli 112×159 çərçivəyə qoyur: 289fea57 STRETCH, 21bc61ca FIT (şəffaf
 * kənarlı) — fixture şəkli elə bu çərçivədə hazırlayır (`fit`), sayt onu 160 hündürlükdə object-contain göstərir.
 */
export const CERT_FRAME = { width: 112, height: 159 } as const;
export const CERTIFICATES: readonly { image: string; fit: "fill" | "contain"; title: string }[] = [
  IMG.certPortrait,
  IMG.certLandscape,
  IMG.certPortrait,
  IMG.certPortrait,
  IMG.certLandscape,
  IMG.certPortrait,
  IMG.certLandscape,
  IMG.certPortrait,
].map((image, i) => ({ image, fit: image === IMG.certLandscape ? "contain" : "fill", title: `Sertifikat ${i + 1}` }));

const LOREM_ABOUT =
  "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo  natus error sit voluptatem accusantium doloremqu. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam.\nNeque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.";

/** Figma 361:10756: orta 6 sətir işarəli siyahıdır (lineTypes UNORDERED) — admin mətnində "- " ilə (proseBlocks). */
const LOREM_EQUIPMENT =
  "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo  natus error sit voluptatem accusantium doloremqu. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium:\n- Sed ut perspiciatis unde \n- Natus error\n- Eaque ipsa quae\n- Unde omnis iste\n- Eaque ipsa quae\n- Ded ut perspiciatis unde \nSed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo  natus error sit voluptatem accusantium doloremqu. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium:";

const LOREM_PRODUCT =
  "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.";

/** Lüğət dəyərləri AZ adı ilə (fixture skripti id-ləri bazadan tapır): 331:10213 xüsusiyyət kartları. */
export const AGRO_DICTS = { industry: "Qida sənayesi", productType: "Ərzaq məhsulları", productionModels: ["Hazır məhsul istehsalçısı"] } as const;

/** Bir zavod sətri: Figma mətnləri + qalereya. Lüğət id-ləri skriptdə əlavə olunur. */
export type AgroFactory = {
  slug: string;
  type: FactoryType;
  name: string;
  legalName: string;
  about: string;
  equipmentText: string;
  employeeCount: number;
  capacityText: string;
  cooperation: Cooperation[];
  phone: string;
  email: string;
  website: string;
  address: string;
  youtubeUrl: string;
  socials: Partial<Record<SocialKey, string>>;
  verified: boolean;
  status: "published";
  tariffCode: "standart";
  tariffRank: 0;
  ratingAvg: number;
  ratingCount: number;
  createdAt: Date;
  cover: string;
  logo: string;
  gallery: readonly string[];
};

export const AGRO: AgroFactory = {
  slug: "figma-agro-trade-supply",
  type: "fabrik",
  name: "Agro Trade Supply",
  legalName: "Agro Trade Supply MMC",
  about: LOREM_ABOUT,
  equipmentText: LOREM_EQUIPMENT,
  employeeCount: 240,
  capacityText: "", // Figma "-"
  cooperation: ["partner"],
  phone: "+994 00 000 00 00",
  email: "agrotrade@info.az",
  website: "https://www.agrotradesupply.az",
  address: "Lorem Ipsum dolor street 00, Baku, Azerbaijan, AZ0000",
  // YouTube önizləməsi i.ytimg.com-dandır (facade); vizual yoxlama onu Figma-dakı video şəkli ilə əvəz edir (capture).
  youtubeUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
  socials: {
    facebook: "https://www.facebook.com/agrotradesupply",
    instagram: "https://www.instagram.com/agrotradesupply",
    linkedin: "https://www.linkedin.com/company/agrotradesupply",
    x: "https://x.com/agrotradesupply",
    youtube: "https://www.youtube.com/@agrotradesupply",
    tiktok: "https://www.tiktok.com/@agrotradesupply",
  },
  verified: true,
  status: "published",
  // Standart tarif: kataloqun 1-ci səhifəsinə və tövsiyə edilənlərə düşmür (1–2-ci addımların hədəfləri dəyişmir).
  tariffCode: "standart",
  tariffRank: 0,
  ratingAvg: 3.5,
  ratingCount: 12,
  createdAt: new Date(Date.UTC(2025, 0, 1)),
  cover: IMG.cover,
  logo: IMG.logo,
  gallery: GALLERY_ABOUT,
};

/**
 * İki zavod: əsas (bütün hədəflər) və `-media` — eyni məlumat, desktop Media tabının qalereyası (368:12413). Reytinq
 * modalının "Təşəkkür" halı da ona səs verir: səs zavodun reytinqini dəyişir, əsas zavodun başlığı 3.5 qalmalıdır.
 */
export const AGRO_FACTORIES: readonly AgroFactory[] = [
  AGRO,
  { ...AGRO, slug: "figma-agro-trade-supply-media", gallery: GALLERY_MEDIA, createdAt: new Date(Date.UTC(2024, 11, 31)) },
];

export const AGRO_PDFS: readonly { title: string }[] = [{ title: "Məhsul Kataloqu 1" }, { title: "Məhsul Kataloqu 2" }];

/** Məhsul səhifəsinin məhsulu (382:11083): Figma-dakı kod. Qalan məhsulların kodu avtomatikdir (1 000 000-dan). */
export const AGRO_PRODUCT_CODE = 1519494;
/** 10 səhifə × 12 (Figma "1 2 3 … 10"). */
export const AGRO_PRODUCT_COUNT = 120;

export type AgroProduct = { id?: number; slug: string; name: string; description: string; images: readonly string[]; createdAt: Date };

/**
 * 120 məhsul, ən yenisi əvvəl: 1–12 Figma kartlarıdır (381:10844: "Məhsulun adı", "Lorem ipsum dolor", şəkil fd23c5eb) —
 * Məhsullar tabının 1-ci səhifəsi və "Oxşar məhsullar"ın 6-sı; 13-cü məhsul səhifəsinin məhsuludur (kod 1519494, uzun
 * təsvir, 6 şəkil 388:11411); qalanı səhifələməni 10 edən eyni kartlardır.
 */
export function agroProducts(newest = new Date(Date.UTC(2025, 4, 1))): AgroProduct[] {
  const name = "Məhsulun adı";
  const slug = slugify(name);
  const at = (i: number) => new Date(newest.getTime() - i * 60_000);
  return Array.from({ length: AGRO_PRODUCT_COUNT }, (_, i) =>
    i === PAGE_PRODUCT_INDEX
      ? { id: AGRO_PRODUCT_CODE, slug, name, description: LOREM_PRODUCT, images: PRODUCT_GALLERY, createdAt: at(i) }
      : { slug, name, description: "Lorem ipsum dolor", images: [IMG.productCard], createdAt: at(i) },
  );
}
const PAGE_PRODUCT_INDEX = 12;
/** 388:11411: böyük 809832e5 (1-ci miniatür 332f3e64-ün yüksək keyfiyyətli nüsxəsi) + 5 miniatür. */
const PRODUCT_GALLERY: readonly string[] = [
  "809832e520184d0ff6a793af5adfa8fa442df1eb",
  "e5af5874cfa9aa02556c3ed42839a667bbe126b2",
  "55faea901a6a697453575e1291423f8947ae21e0",
  "97a12dba0aeb2ae4f4945ef9794e438b584c311c",
  "1ec21147e959856f4f9ad4befb5d3696ed1aa67e",
  "91f274e7292ec5fd07c98b8d2529b962c4a8133c",
];

export type AgroVacancy = { slug: string; title: string; salary: number; currency: "AZN"; publishedAt: Date };

/**
 * 10 vakansiya (357:10612…: hamısı "Middle UX/UI Designer", 05.05.2025, 1200₼): 8-dən çox olmalıdır ki, Figma-dakı
 * "Daha çox göstər" (368:11002) görünsün. Slug bazada unikaldır.
 */
export function agroVacancies(): AgroVacancy[] {
  return Array.from({ length: 10 }, (_, i) => ({
    slug: `figma-vakansiya-${String(i + 1).padStart(2, "0")}`,
    title: "Middle UX/UI Designer",
    salary: 1200,
    currency: "AZN",
    publishedAt: new Date(Date.UTC(2025, 4, 5, 8, 0) - i * 60_000), // Bakı vaxtı ilə 05.05.2025
  }));
}

/** Bütün fərqli şəkil faylları (yoxlama üçün). */
export const AGRO_IMAGES: readonly string[] = [
  ...new Set([IMG.cover, IMG.logo, ...GALLERY_ABOUT, ...GALLERY_MEDIA, IMG.productCard, ...PRODUCT_GALLERY, IMG.certPortrait, IMG.certLandscape]),
];
