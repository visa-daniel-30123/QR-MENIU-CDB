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

const MENU_ITEMS_RAW = [
  { productKey: "hot-dog", name: "Hot Dog", detail: "100 gr", category: "Preparate calde" },
  { productKey: "meniu-aripioare", name: "Meniu Aripioare", detail: "Aripioare / cartofi / sos", category: "Preparate calde" },
  { productKey: "meniu-crispy", name: "Meniu Crispy", detail: "Crispy / cartofi / sos", category: "Preparate calde" },
  { productKey: "meniu-cascaval", name: "Meniu Cașcaval Pane", detail: "Cașcaval pane / cartofi / sos", category: "Preparate calde" },
  { name: "Cartofi prăjiți", detail: "200 gr", category: "Preparate calde" },
  { productKey: "mici", name: "Mici", detail: "70 gr", category: "Preparate la grătar" },
  { productKey: "ceafa", name: "Ceafă", detail: "200 gr", category: "Preparate la grătar" },
  { productKey: "carnaciori", name: "Cârnăciori", detail: "50 gr", category: "Preparate la grătar" },
  { name: "Chiflă / pâine", detail: "50 gr", category: "Preparate la grătar" },
  { name: "Kürtős Kalács", detail: "400 gr", category: "Dulciuri" },
  { name: "Kürtős cu înghețată", detail: "250 gr", category: "Dulciuri" },
  { name: "Înghețată", detail: "50 gr", category: "Dulciuri" },
  { name: "Cafea Julius Meinl", detail: "100 ml", category: "Băuturi calde" },
  { name: "Ceai", detail: "300 ml", category: "Băuturi calde" },
  { name: "Ciocolată caldă", detail: "200 ml", category: "Băuturi calde" },
  { name: "Vin fiert", detail: "200 ml", category: "Băuturi calde" },
  { name: "Coca Cola", detail: "0,5 L", category: "Sucuri" },
  { name: "Coca Zero", detail: "0,5 L", category: "Sucuri" },
  { name: "Fanta Orange", detail: "0,5 L", category: "Sucuri" },
  { name: "Sprite", detail: "0,5 L", category: "Sucuri" },
  { name: "Fuze Tea", detail: "0,5 L", category: "Sucuri" },
  { name: "Limonadă", detail: "0,35 L", category: "Sucuri" },
  { name: "Schweppes", detail: "0,5 L", category: "Sucuri" },
  { name: "Monster", detail: "0,5 L", category: "Energizante" },
  { name: "Red Bull", detail: "0,25 L", category: "Energizante" },
  { name: "Apă plată", detail: "0,5 L", category: "Apă" },
  { name: "Apă minerală", detail: "0,5 L", category: "Apă" },
  { name: "Apă Tușnad", detail: "2 L", category: "Apă" },
  { name: "Bergenbier", detail: "0,33 L", category: "Bere" },
  { name: "Bergenbier", detail: "0,5 L", category: "Bere" },
  { name: "Beck's", detail: "0,33 L", category: "Bere" },
  { name: "Beck's", detail: "0,5 L", category: "Bere" },
  { name: "Stella", detail: "0,33 L", category: "Bere" },
  { name: "Stella NA", detail: "0,33 L", category: "Bere fără alcool" },
  { name: "Bergenbier Fresh Lămâie", detail: "0,5 L", category: "Bere fără alcool" },
  { name: "Bergenbier Grapefruit NA", detail: "0,5 L", category: "Bere fără alcool" },
];

export const MENU_PRODUCTS = MENU_ITEMS_RAW.map((item) => ({
  id: getMenuId(item.productKey, item.name, item.detail),
  name: item.name,
  detail: item.detail,
  category: item.category,
}));
