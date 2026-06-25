export function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getMenuId(productKey, name, detail) {
  if (productKey) return productKey;
  return slugify(`${name}-${detail || ""}`);
}

export const GRILL_PLATE_UNIT_IDS = ["mici", "carnaciori", "ceafa"];

const MENU_ITEMS_RAW = [
  { productKey: "hot-dog", name: "Hot Dog", detail: "100 gr", category: "Preparate calde", price: 10 },
  { productKey: "meniu-aripioare", name: "Meniu Aripioare", detail: "Aripioare / cartofi / sos", category: "Preparate calde", price: 32 },
  { productKey: "meniu-crispy", name: "Meniu Crispy", detail: "Crispy / cartofi / sos", category: "Preparate calde", price: 35 },
  { productKey: "meniu-cascaval", name: "Meniu Cașcaval Pane", detail: "Cașcaval pane / cartofi / sos", category: "Preparate calde", price: 32 },
  { name: "Cartofi prăjiți", detail: "200 gr", category: "Preparate calde", price: 10 },
  { productKey: "mici", name: "Mici", detail: "70 gr", category: "Preparate la grătar", price: 7 },
  { productKey: "ceafa", name: "Ceafă", detail: "200 gr", category: "Preparate la grătar", price: 20 },
  { productKey: "carnaciori", name: "Cârnăciori", detail: "50 gr", category: "Preparate la grătar", price: 6 },
  {
    productKey: "farfurie-gratar",
    name: "Farfurie la grătar",
    detail: "Mici / cârnăciori / ceafă la alegere",
    category: "Preparate la grătar",
    priceFromGrillMin: true,
  },
  { name: "Chiflă / pâine", detail: "50 gr", category: "Preparate la grătar", price: 1 },
  { name: "Kürtős Kalács", detail: "400 gr", category: "Dulciuri", price: 20 },
  { name: "Kürtős cu înghețată", detail: "250 gr", category: "Dulciuri", price: 20 },
  { name: "Înghețată", detail: "50 gr", category: "Dulciuri", price: 5 },
  { name: "Magnum", category: "Dulciuri", price: 20 },
  { name: "Scufița roșie", category: "Dulciuri", price: 8 },
  { name: "Twister", category: "Dulciuri", price: 8 },
  { name: "Vulcano", category: "Dulciuri", price: 18 },
  { name: "Cornetto Max", category: "Dulciuri", price: 12 },
  { name: "Cornetto King", category: "Dulciuri", price: 18 },
  { name: "Cornetto King White", category: "Dulciuri", price: 18 },
  { name: "Cornetto King Tropical", category: "Dulciuri", price: 18 },
  { name: "Cornetto Classico Vanilie", category: "Dulciuri", price: 12 },
  { name: "Gogoși tradiționale", detail: "3 buc. · 100 gr", category: "Dulciuri", price: 10 },
  { name: "Julius Meinl Espresso Ristretto", detail: "40 ml", category: "Băuturi calde", price: 12 },
  { name: "Julius Meinl Espresso Lungo", detail: "100 ml", category: "Băuturi calde", price: 12 },
  { name: "Julius Meinl Cappuccino", detail: "150 ml", category: "Băuturi calde", price: 12 },
  { name: "Cafea Frappé", detail: "350 ml", category: "Băuturi calde", price: 15 },
  { name: "Ceai", detail: "300 ml", category: "Băuturi calde", price: 4 },
  { name: "Ciocolată caldă", detail: "200 ml", category: "Băuturi calde", price: 6 },
  { name: "Vin fiert", detail: "200 ml", category: "Băuturi calde", price: 6 },
  { name: "Coca Cola", detail: "0,5 L", category: "Sucuri", price: 12 },
  { name: "Coca Zero", detail: "0,5 L", category: "Sucuri", price: 12 },
  { name: "Fanta Orange", detail: "0,5 L", category: "Sucuri", price: 12 },
  { name: "Sprite", detail: "0,5 L", category: "Sucuri", price: 12 },
  { name: "Fuze Tea", detail: "0,5 L", category: "Sucuri", price: 10 },
  { name: "Limonadă", detail: "0,35 L", category: "Sucuri", price: 8 },
  { name: "Granini", detail: "0,3 L", category: "Sucuri", price: 10 },
  { name: "Schweppes Bitter Lemon", detail: "0,5 L", category: "Sucuri", price: 12 },
  { name: "Schweppes Mandarin", detail: "0,5 L", category: "Sucuri", price: 12 },
  { name: "Monster", detail: "0,5 L", category: "Energizante", price: 12 },
  { name: "Red Bull", detail: "0,25 L", category: "Energizante", price: 10 },
  { name: "Apă plată", detail: "0,5 L", category: "Apă", price: 8 },
  { name: "Apă minerală", detail: "0,5 L", category: "Apă", price: 8 },
  { name: "Apă Tușnad", detail: "1 L", category: "Apă", price: 12 },
  { name: "Apă Tușnad", detail: "2 L", category: "Apă", price: 15 },
  { name: "Bergenbier", detail: "0,33 L", category: "Bere", price: 11 },
  { name: "Bergenbier", detail: "0,5 L", category: "Bere", price: 11 },
  { name: "Beck's", detail: "0,33 L", category: "Bere", price: 12 },
  { name: "Beck's", detail: "0,5 L", category: "Bere", price: 12 },
  { name: "Stella", detail: "0,33 L", category: "Bere", price: 13 },
  { name: "Stella NA", detail: "0,33 L", category: "Bere fără alcool", price: 13 },
  { name: "Ursus Cooler", detail: "0,5 L", category: "Bere fără alcool", price: 7 },
  { name: "Bergenbier Fresh Lămâie", detail: "0,5 L", category: "Bere fără alcool", price: 7 },
  { name: "Bergenbier Grapefruit NA", detail: "0,5 L", category: "Bere fără alcool", price: 7 },
];

const MENU_ID_INDEX = buildMenuIdIndex();
const MENU_BY_ID = buildMenuById();

function buildMenuIdIndex() {
  const aliasToCanonical = new Map();
  const canonicalToAliases = new Map();

  MENU_ITEMS_RAW.forEach((item) => {
    const canonical = getMenuId(item.productKey, item.name, item.detail);
    const aliases = new Set([canonical, slugify(`${item.name}-${item.detail || ""}`)]);
    if (item.productKey) aliases.add(item.productKey);

    canonicalToAliases.set(canonical, aliases);
    aliases.forEach((alias) => aliasToCanonical.set(alias, canonical));
  });

  aliasToCanonical.set("hot=dog", "hot-dog");
  aliasToCanonical.set("hot_dog", "hot-dog");
  aliasToCanonical.set("hotdog", "hot-dog");

  return { aliasToCanonical, canonicalToAliases };
}

function buildMenuById() {
  const map = new Map();
  MENU_ITEMS_RAW.forEach((item) => {
    const id = getMenuId(item.productKey, item.name, item.detail);
    map.set(id, {
      id,
      name: item.name,
      detail: item.detail ?? "",
      category: item.category,
      defaultPrice: item.price ?? null,
      priceFromGrillMin: Boolean(item.priceFromGrillMin),
      productKey: item.productKey || "",
    });
  });
  return map;
}

export function resolveCanonicalMenuId(id) {
  if (typeof id !== "string") return "";
  const trimmed = id.trim().toLowerCase();
  return MENU_ID_INDEX.aliasToCanonical.get(trimmed) || trimmed;
}

export function getProductIdVariants(canonicalId) {
  return MENU_ID_INDEX.canonicalToAliases.get(canonicalId) || new Set([canonicalId]);
}

export function getMenuItemMeta(menuId) {
  return MENU_BY_ID.get(resolveCanonicalMenuId(menuId)) || null;
}

export function normalizeUnavailableIds(ids) {
  const normalized = new Set();
  (ids instanceof Set ? [...ids] : ids).forEach((id) => {
    normalized.add(resolveCanonicalMenuId(id));
  });
  return normalized;
}

export function isMenuIdUnavailable(menuId, unavailableIds) {
  return unavailableIds.has(resolveCanonicalMenuId(menuId));
}

export function formatMenuPriceLabel(price, meta) {
  if (meta?.priceFromGrillMin) {
    return `de la ${price} lei`;
  }
  if (price === 1) return "1 leu";
  return `${price} lei`;
}

export function getFarfurieFromPrice(pricesMap) {
  const values = GRILL_PLATE_UNIT_IDS.map((id) => pricesMap[id]).filter(
    (value) => typeof value === "number"
  );
  return values.length ? Math.min(...values) : null;
}

export const DEFAULT_MENU_PRICES = Object.fromEntries(
  MENU_ITEMS_RAW.filter((item) => item.price != null).map((item) => [
    getMenuId(item.productKey, item.name, item.detail),
    item.price,
  ])
);

export const CARTOFI_MENU_ID = getMenuId(null, "Cartofi prăjiți", "200 gr");
export const BREAD_MENU_ID = getMenuId(null, "Chiflă / pâine", "50 gr");

export const MENU_PRODUCTS = MENU_ITEMS_RAW.map((item) => {
  const id = getMenuId(item.productKey, item.name, item.detail);
  return {
    id,
    name: item.name,
    detail: item.detail ?? "",
    category: item.category,
    defaultPrice: item.price ?? getFarfurieFromPrice(DEFAULT_MENU_PRICES),
    priceFromGrillMin: Boolean(item.priceFromGrillMin),
  };
});
