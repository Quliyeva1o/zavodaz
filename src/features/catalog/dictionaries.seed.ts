// Filter dictionary values: Figma "Mob/Filtr/*" frames (typos fixed) + the full list of Azerbaijani cities and districts.
// Seed data only — admin edits win (the seed never overwrites an existing slug).
import type { Localized } from "@/i18n/config";
import { slugify } from "./slug";

export type DictSeedItem = { slug: string; name: Localized };

const entries = (rows: [az: string, en: string, ru: string][]): DictSeedItem[] =>
  rows.map(([az, en, ru]) => ({ slug: slugify(az), name: { az, en, ru } }));

const industries = entries([
  ["Metal emalı", "Metalworking", "Металлообработка"],
  ["Maşınqayırma", "Mechanical engineering", "Машиностроение"],
  ["Tekstil (Toxuculuq)", "Textiles (Weaving)", "Текстиль (Ткачество)"],
  ["Qida sənayesi", "Food industry", "Пищевая промышленность"],
  ["Kimya sənayesi", "Chemical industry", "Химическая промышленность"],
  ["Plastik və polimer emalı", "Plastic and polymer processing", "Переработка пластмасс и полимеров"],
  ["Tikinti materialları istehsalı", "Building materials production", "Производство строительных материалов"],
  ["Kənd təsərrüfatı istehsalı", "Agricultural production", "Сельскохозяйственное производство"],
  ["Ağac və mebel istehsalı", "Wood and furniture production", "Производство древесины и мебели"],
  ["Enerji və alternativ enerji istehsalı", "Energy and alternative energy production", "Производство энергии и альтернативной энергии"],
]);

const productTypes = entries([
  ["Ərzaq məhsulları", "Food products", "Продовольственные товары"],
  ["Sənaye avadanlıqları", "Industrial equipment", "Промышленное оборудование"],
  ["Əlvan metallar və profillər", "Non-ferrous metals and profiles", "Цветные металлы и профили"],
  ["Paltar və tekstil məhsulları", "Clothing and textile products", "Одежда и текстильные изделия"],
  ["Plastik və qablaşdırma məhsulları", "Plastic and packaging products", "Пластиковая продукция и упаковка"],
  ["Elektrik avadanlıqlar", "Electrical equipment", "Электрооборудование"],
  ["Tikinti materialları", "Building materials", "Строительные материалы"],
]);

const productionModels = entries([
  ["İxrac yönümlü", "Export-oriented", "Экспортно-ориентированное"],
  ["Daxili bazara yönəlmiş", "Domestic market-oriented", "Ориентированное на внутренний рынок"],
  ["Xammal emalı müəssisəsi", "Raw material processing enterprise", "Предприятие по переработке сырья"],
  ["Hazır məhsul istehsalçısı", "Finished goods manufacturer", "Производитель готовой продукции"],
  ["OEM (Orijinal avadanlıq istehsalçısı)", "OEM (Original Equipment Manufacturer)", "OEM (Оригинальный производитель оборудования)"],
]);

// Azerbaijani alphabet order (a b c ç d e ə f g ğ h x ı i j k q l m n o ö p r s ş t u ü v y z).
// The head of the list is exactly the Figma dropdown (Ağcabədi … Biləsuvar, no Abşeron/Balakən),
// so those two districts, missing from Figma, are appended at the end instead of their alphabetical place.
const cities = entries([
  ["Ağcabədi", "Aghjabadi", "Агджабеди"],
  ["Ağdam", "Agdam", "Агдам"],
  ["Ağdaş", "Agdash", "Агдаш"],
  ["Ağdərə", "Aghdara", "Агдере"],
  ["Ağstafa", "Agstafa", "Агстафа"],
  ["Ağsu", "Agsu", "Агсу"],
  ["Astara", "Astara", "Астара"],
  ["Babək", "Babek", "Бабек"],
  ["Bakı", "Baku", "Баку"],
  ["Beyləqan", "Beylagan", "Бейлаган"],
  ["Bərdə", "Barda", "Барда"],
  ["Biləsuvar", "Bilasuvar", "Билясувар"],
  ["Cəbrayıl", "Jabrayil", "Джебраил"],
  ["Cəlilabad", "Jalilabad", "Джалилабад"],
  ["Culfa", "Julfa", "Джульфа"],
  ["Daşkəsən", "Dashkasan", "Дашкесан"],
  ["Füzuli", "Fuzuli", "Физули"],
  ["Gədəbəy", "Gadabay", "Гедабей"],
  ["Gəncə", "Ganja", "Гянджа"],
  ["Goranboy", "Goranboy", "Горанбой"],
  ["Göyçay", "Goychay", "Гёйчай"],
  ["Göygöl", "Goygol", "Гёйгёль"],
  ["Hacıqabul", "Hajigabul", "Гаджигабул"],
  ["Xaçmaz", "Khachmaz", "Хачмас"],
  ["Xankəndi", "Khankendi", "Ханкенди"],
  ["Xızı", "Khizi", "Хызы"],
  ["Xocalı", "Khojaly", "Ходжалы"],
  ["Xocavənd", "Khojavend", "Ходжавенд"],
  ["İmişli", "Imishli", "Имишли"],
  ["İsmayıllı", "Ismayilli", "Исмаиллы"],
  ["Kəlbəcər", "Kalbajar", "Кельбаджар"],
  ["Kəngərli", "Kangarli", "Кангарли"],
  ["Kürdəmir", "Kurdamir", "Кюрдамир"],
  ["Qax", "Gakh", "Гах"],
  ["Qazax", "Gazakh", "Газах"],
  ["Qəbələ", "Gabala", "Габала"],
  ["Qobustan", "Gobustan", "Гобустан"],
  ["Quba", "Guba", "Куба"],
  ["Qubadlı", "Gubadli", "Губадлы"],
  ["Qusar", "Gusar", "Гусар"],
  ["Laçın", "Lachin", "Лачин"],
  ["Lerik", "Lerik", "Лерик"],
  ["Lənkəran", "Lankaran", "Ленкорань"],
  ["Masallı", "Masalli", "Масаллы"],
  ["Mingəçevir", "Mingachevir", "Мингечевир"],
  ["Naftalan", "Naftalan", "Нафталан"],
  ["Naxçıvan", "Nakhchivan", "Нахичевань"],
  ["Neftçala", "Neftchala", "Нефтчала"],
  ["Oğuz", "Oghuz", "Огуз"],
  ["Ordubad", "Ordubad", "Ордубад"],
  ["Saatlı", "Saatli", "Саатлы"],
  ["Sabirabad", "Sabirabad", "Сабирабад"],
  ["Salyan", "Salyan", "Сальян"],
  ["Samux", "Samukh", "Самух"],
  ["Sədərək", "Sadarak", "Садарак"],
  ["Siyəzən", "Siyazan", "Сиязань"],
  ["Sumqayıt", "Sumgait", "Сумгайыт"],
  ["Şabran", "Shabran", "Шабран"],
  ["Şahbuz", "Shahbuz", "Шахбуз"],
  ["Şamaxı", "Shamakhi", "Шамахы"],
  ["Şəki", "Sheki", "Шеки"],
  ["Şəmkir", "Shamkir", "Шамкир"],
  ["Şərur", "Sharur", "Шарур"],
  ["Şirvan", "Shirvan", "Ширван"],
  ["Şuşa", "Shusha", "Шуша"],
  ["Tərtər", "Tartar", "Тертер"],
  ["Tovuz", "Tovuz", "Товуз"],
  ["Ucar", "Ujar", "Уджар"],
  ["Yardımlı", "Yardimli", "Ярдымлы"],
  ["Yevlax", "Yevlakh", "Евлах"],
  ["Zaqatala", "Zagatala", "Загатала"],
  ["Zəngilan", "Zangilan", "Зангилан"],
  ["Zərdab", "Zardab", "Зардаб"],
  // Not in the Figma list, appended (see the comment above).
  ["Abşeron", "Absheron", "Апшерон"],
  ["Balakən", "Balakan", "Балакен"],
]);

export const DICTIONARY_SEED: Record<"cities" | "industries" | "productTypes" | "productionModels", DictSeedItem[]> = {
  cities,
  industries,
  productTypes,
  productionModels,
};
