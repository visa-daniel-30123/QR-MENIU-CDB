import { getMenuId, getMenuItemMeta, resolveCanonicalMenuId } from "./menu-catalog.js?v=8";

export const LANG_STORAGE_KEY = "cdb-menu-lang";

const UI = {
  ro: {
    "header.subtitle": "Terasă & restaurant",
    "header.location": "Porumbacu de Sus · zonă turistică",
    "nav.all": "Toate",
    "nav.food": "Mâncare",
    "nav.sweets": "Dulciuri",
    "nav.drinks": "Băuturi",
    "cart.label": "🛒 Coș",
    "cart.checkout": "Finalizează",
    "cart.empty": "0 produse · 0 lei",
    "cart.one": "1 produs",
    "cart.many": "produse",
    "cart.edit": "Editează",
    "cart.less": "Mai puțin",
    "cart.more": "Mai mult",
    "footer.note": "Prețurile sunt exprimate în lei (RON)",
    "badge.unavailable": "Indisponibil",
    "options.title": "Personalizează",
    "options.add": "Adaugă în coș",
    "options.save": "Salvează",
    "options.cancel": "Anulează",
    "options.close": "Închide",
    "options.sauces.pick": "Alege până la {n} sosuri:",
    "options.sauces.pickOptional": "Alege până la {n} sosuri (opțional):",
    "options.sauces.pickOne": "Alege cel puțin un sos.",
    "options.sauces.max": "Poți alege maximum {n} sosuri.",
    "options.bread": "Vrei și pâine?",
    "options.fries": "Vrei și cartofi prăjiți?",
    "options.plate.bread": "Pâine",
    "options.plate.pick": "Alege ce pui pe farfurie:",
    "options.plate.min": "Alege cel puțin un preparat pe farfurie.",
    "options.pieces": "Câte bucăți dorești?",
    "options.milk": "Dorești lapte?",
    "options.milk.yes": "Cu lapte",
    "drink.title": "Ceva de băut?",
    "drink.hint": "Ai comandat mâncare — poate vrei și ceva de băut?",
    "drink.continue": "Continuă la comandă",
    "checkout.title": "Finalizează comanda",
    "checkout.total": "Total:",
    "checkout.success": "Comanda a fost trimisă! O pregătim imediat.",
    "checkout.table": "Nr. masă",
    "checkout.tablePh": "Ex: 5",
    "checkout.notes": "Observații (opțional)",
    "checkout.notesPh": "Ex: fără muștar",
    "checkout.submit": "Trimite comanda",
    "checkout.tableBadge": "Comandă pentru masa {n}",
    "checkout.headerTable": "Masă {n}",
    "error.firebase": "Comenzile online nu sunt disponibile momentan. Contactează ospătarul.",
    "error.submit": "Comanda nu a putut fi trimisă. Verifică conexiunea.",
    "error.firebaseConfig": "Trimiterea comenzilor necesită configurarea Firebase.",
    "lang.label": "Limba",
    "cart.addShort": "+ Adaugă",
    "cart.addLabel": "Adaugă {name} în coș",
    "cart.unavailableLabel": "{name} — indisponibil",
    "cart.inCart": "✓ În coș",
    "header.subtitle": "Terrace & restaurant",
    "header.location": "Porumbacu de Sus · tourist area",
    "nav.all": "All",
    "nav.food": "Food",
    "nav.sweets": "Desserts",
    "nav.drinks": "Drinks",
    "cart.label": "🛒 Cart",
    "cart.checkout": "Checkout",
    "cart.empty": "0 items · 0 lei",
    "cart.one": "1 item",
    "cart.many": "items",
    "cart.edit": "Edit",
    "cart.less": "Less",
    "cart.more": "More",
    "footer.note": "Prices are in Romanian lei (RON)",
    "badge.unavailable": "Unavailable",
    "options.title": "Customize",
    "options.add": "Add to cart",
    "options.save": "Save",
    "options.cancel": "Cancel",
    "options.close": "Close",
    "options.sauces.pick": "Choose up to {n} sauces:",
    "options.sauces.pickOptional": "Choose up to {n} sauces (optional):",
    "options.sauces.pickOne": "Choose at least one sauce.",
    "options.sauces.max": "You can choose up to {n} sauces.",
    "options.bread": "Add bread?",
    "options.fries": "Add french fries?",
    "options.plate.bread": "Bread",
    "options.plate.pick": "Choose what goes on the plate:",
    "options.plate.min": "Choose at least one item for the plate.",
    "options.pieces": "How many would you like?",
    "options.milk": "Would you like milk?",
    "options.milk.yes": "With milk",
    "drink.title": "Something to drink?",
    "drink.hint": "You ordered food — would you like a drink too?",
    "drink.continue": "Continue to checkout",
    "checkout.title": "Complete your order",
    "checkout.total": "Total:",
    "checkout.success": "Order sent! We're preparing it now.",
    "checkout.table": "Table no.",
    "checkout.tablePh": "e.g. 5",
    "checkout.notes": "Notes (optional)",
    "checkout.notesPh": "e.g. no mustard",
    "checkout.submit": "Send order",
    "checkout.tableBadge": "Order for table {n}",
    "checkout.headerTable": "Table {n}",
    "error.firebase": "Online ordering is unavailable. Please ask the waiter.",
    "error.submit": "Could not send the order. Check your connection.",
    "error.firebaseConfig": "Sending orders requires Firebase configuration.",
    "lang.label": "Language",
    "cart.addShort": "+ Add",
    "cart.addLabel": "Add {name} to cart",
    "cart.unavailableLabel": "{name} — unavailable",
    "cart.inCart": "✓ In cart",
  },
};

const CATEGORY_EN = {
  "preparate-calde": "Hot dishes",
  "preparate-la-gratar": "Grilled dishes",
  dulciuri: "Desserts",
  "bauturi-calde": "Hot drinks",
  sucuri: "Soft drinks",
  energizante: "Energy drinks",
  apa: "Water",
  bere: "Beer",
  "bere-fara-alcool": "Non-alcoholic beer",
};

const PRODUCT_EN = {
  "hot-dog": "Hot Dog",
  "meniu-aripioare": "Wings menu",
  "meniu-crispy": "Crispy menu",
  "meniu-cascaval": "Fried cheese menu",
  "cartofi-prajiti-200-gr": "French fries",
  "mici-70-gr": "Grilled minced rolls (mici)",
  "ceafa-200-gr": "Pork neck steak",
  "carnaciori-50-gr": "Sausages",
  "farfurie-gratar": "Mixed grill plate",
  "chifla-paine-50-gr": "Bread roll",
  "kurtos-kalacs-400-gr": "Chimney cake (kürtős)",
  "kurtos-cu-inghetata-250-gr": "Chimney cake with ice cream",
  "inghetata-50-gr": "Ice cream",
  magnum: "Magnum",
  "scufita-rosie": "Little Red Riding Hood",
  twister: "Twister",
  vulcano: "Vulcano",
  "cornetto-max": "Cornetto Max",
  "cornetto-king": "Cornetto King",
  "cornetto-king-white": "Cornetto King White",
  "cornetto-king-tropical": "Cornetto King Tropical",
  "cornetto-classico-vanilie": "Cornetto Classico Vanilla",
  "gogosi-traditionale-3-buc-100-gr": "Traditional donuts",
  "julius-meinl-espresso-ristretto-40-ml": "Julius Meinl Espresso Ristretto",
  "julius-meinl-espresso-lungo-100-ml": "Julius Meinl Espresso Lungo",
  "julius-meinl-cappuccino-150-ml": "Julius Meinl Cappuccino",
  "cafea-frappe-350-ml": "Coffee Frappé",
  "ceai-300-ml": "Tea",
  "ciocolata-calda-200-ml": "Hot chocolate",
  "vin-fiert-200-ml": "Mulled wine",
  "coca-cola-05-l": "Coca Cola",
  "coca-zero-05-l": "Coca Zero",
  "fanta-orange-05-l": "Fanta Orange",
  "sprite-05-l": "Sprite",
  "fuze-tea-05-l": "Fuze Tea",
  "limonada-035-l": "Lemonade",
  "granini-03-l": "Granini",
  "schweppes-bitter-lemon-05-l": "Schweppes Bitter Lemon",
  "schweppes-mandarin-05-l": "Schweppes Mandarin",
  "monster-05-l": "Monster",
  "red-bull-025-l": "Red Bull",
  "apa-plata-05-l": "Still water",
  "apa-minerala-05-l": "Sparkling water",
  "apa-tusnad-1-l": "Tușnad water",
  "apa-tusnad-2-l": "Tușnad water",
  "bergenbier-033-l": "Bergenbier",
  "bergenbier-05-l": "Bergenbier",
  "becks-033-l": "Beck's",
  "becks-05-l": "Beck's",
  "stella-033-l": "Stella",
  "stella-na-033-l": "Stella NA",
  "ursus-cooler-05-l": "Ursus Cooler",
  "bergenbier-fresh-lamaie-05-l": "Bergenbier Fresh Lemon",
  "bergenbier-grapefruit-na-05-l": "Bergenbier Grapefruit NA",
};

const DETAIL_EN = {
  "meniu-aripioare": "Wings / fries / sauce — 200 g / 175 g / 25 g",
  "meniu-crispy": "Crispy / fries / sauce — 200 g / 175 g / 25 g",
  "meniu-cascaval": "Fried cheese / fries / sauce — 200 g / 175 g / 25 g",
  "farfurie-gratar": "Mici / sausages / pork neck — your choice",
  "gogosi-traditionale-3-buc-100-gr": "3 pcs · 100 g",
};

const langChangeCallbacks = new Set();

export function getLang() {
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  return stored === "en" ? "en" : "ro";
}

export function setLang(lang) {
  localStorage.setItem(LANG_STORAGE_KEY, lang === "en" ? "en" : "ro");
}

export function onLangChange(callback) {
  langChangeCallbacks.add(callback);
  return () => langChangeCallbacks.delete(callback);
}

function notifyLangChange(lang) {
  langChangeCallbacks.forEach((cb) => cb(lang));
}

export function t(key, vars = {}) {
  const lang = getLang();
  let text = UI[lang]?.[key] ?? UI.ro[key] ?? key;
  Object.entries(vars).forEach(([name, value]) => {
    text = text.replace(`{${name}}`, String(value));
  });
  return text;
}

export function getRomanianProductName(menuId, fallback = "") {
  const canonical = resolveCanonicalMenuId(menuId);
  return getMenuItemMeta(canonical)?.name || fallback;
}

export function getProductDisplayName(menuId, roName, lang = getLang()) {
  if (lang !== "en") return roName;
  const canonical = resolveCanonicalMenuId(menuId);
  return PRODUCT_EN[canonical] || roName;
}

export function getDetailDisplayName(menuId, roDetail, lang = getLang()) {
  if (lang !== "en" || !roDetail) return roDetail;
  const canonical = resolveCanonicalMenuId(menuId);
  return DETAIL_EN[canonical] || roDetail;
}

function ensureMenuItemRoData() {
  document.querySelectorAll(".menu-item").forEach((item) => {
    const nameEl = item.querySelector(".menu-item__name");
    const detailEl = item.querySelector(".menu-item__detail");
    if (nameEl && !nameEl.dataset.nameRo) {
      nameEl.dataset.nameRo = nameEl.textContent.trim();
    }
    if (detailEl && !detailEl.dataset.detailRo) {
      detailEl.dataset.detailRo = detailEl.textContent.trim();
    }
  });
}

export function applyMenuLanguage(lang = getLang()) {
  document.documentElement.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const vars = el.dataset.i18nVars ? JSON.parse(el.dataset.i18nVars) : {};
    el.textContent = t(key, vars);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });

  document.querySelectorAll("[data-i18n-cat]").forEach((el) => {
    if (!el.dataset.nameRo) el.dataset.nameRo = el.textContent.trim();
    el.textContent =
      lang === "en"
        ? CATEGORY_EN[el.dataset.i18nCat] || el.dataset.nameRo
        : el.dataset.nameRo;
  });

  ensureMenuItemRoData();

  document.querySelectorAll(".menu-item").forEach((item) => {
    const menuId = item.dataset.menuId;
    const nameEl = item.querySelector(".menu-item__name");
    const detailEl = item.querySelector(".menu-item__detail");
    if (!menuId || !nameEl) return;

    const roName = nameEl.dataset.nameRo || nameEl.textContent.trim();
    nameEl.textContent = getProductDisplayName(menuId, roName, lang);

    if (detailEl) {
      const roDetail = detailEl.dataset.detailRo || detailEl.textContent.trim();
      detailEl.textContent = getDetailDisplayName(menuId, roDetail, lang);
    }
  });
}

export function initLangSwitcher() {
  const switcher = document.getElementById("lang-switch");
  if (!switcher) return;

  const current = getLang();
  switcher.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.classList.toggle("lang-switch__btn--active", btn.dataset.lang === current);
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang === "en" ? "en" : "ro";
      setLang(lang);
      switcher.querySelectorAll("[data-lang]").forEach((b) => {
        b.classList.toggle("lang-switch__btn--active", b === btn);
      });
      applyMenuLanguage(lang);
      notifyLangChange(lang);
    });
  });
}

export function getMenuIdFromItem(item, productKey, name, detail) {
  return item.dataset.menuId || getMenuId(productKey, name, detail);
}
