import {
  doc,
  onSnapshot,
  setDoc,
  getDocFromServer,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "./firebase-app.js";
import {
  DEFAULT_MENU_PRICES,
  MENU_PRODUCTS,
  resolveCanonicalMenuId,
  formatMenuPriceLabel,
  getFarfurieFromPrice,
  getMenuItemMeta,
  getMenuId,
} from "./menu-catalog.js";

const PRICES_REF = doc(db, "menu", "prices");

const PRODUCT_KEY_BY_NAME = {
  "Meniu Aripioare": "meniu-aripioare",
  "Meniu Crispy": "meniu-crispy",
  "Meniu Cașcaval Pane": "meniu-cascaval",
  "Hot Dog": "hot-dog",
  Mici: "mici",
  Ceafă: "ceafa",
  Cârnăciori: "carnaciori",
  "Farfurie la grătar": "farfurie-gratar",
};

function pricesFromSnapshot(snapshot) {
  const raw = snapshot.exists() ? snapshot.data()?.prices : null;
  if (!raw || typeof raw !== "object") return {};

  const overrides = {};
  Object.entries(raw).forEach(([id, value]) => {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return;
    overrides[resolveCanonicalMenuId(id)] = Math.round(value);
  });
  return overrides;
}

function updatedAtFromSnapshot(snapshot) {
  if (!snapshot.exists()) return 0;
  const value = snapshot.data()?.updatedAt;
  return typeof value === "number" ? value : 0;
}

export function buildEffectivePrices(overrides = {}) {
  const prices = { ...DEFAULT_MENU_PRICES };
  Object.entries(overrides).forEach(([id, value]) => {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      prices[resolveCanonicalMenuId(id)] = Math.round(value);
    }
  });
  return prices;
}

export function getEffectivePrice(menuId, pricesMap) {
  const canonical = resolveCanonicalMenuId(menuId);
  const meta = getMenuItemMeta(canonical);
  if (meta?.priceFromGrillMin) {
    return getFarfurieFromPrice(pricesMap);
  }
  return pricesMap[canonical] ?? DEFAULT_MENU_PRICES[canonical] ?? null;
}

export function subscribeMenuPrices(callback, onError) {
  if (!db) {
    callback(buildEffectivePrices(), 0);
    return () => {};
  }

  return onSnapshot(
    PRICES_REF,
    (snapshot) => {
      callback(buildEffectivePrices(pricesFromSnapshot(snapshot)), updatedAtFromSnapshot(snapshot));
    },
    (error) => {
      console.error("menu prices subscribe error:", error);
      if (onError) onError(error);
    }
  );
}

export async function refreshMenuPrices() {
  if (!db) return buildEffectivePrices();
  try {
    const snapshot = await getDocFromServer(PRICES_REF);
    return buildEffectivePrices(pricesFromSnapshot(snapshot));
  } catch (err) {
    console.warn("refresh menu prices:", err);
    return buildEffectivePrices();
  }
}

export async function updateProductPrice(menuId, newPrice) {
  if (!db) throw new Error("Firebase nu e configurat.");

  const canonical = resolveCanonicalMenuId(menuId);
  const meta = getMenuItemMeta(canonical);
  if (meta?.priceFromGrillMin) {
    throw new Error("Prețul farfuriei se calculează automat din grătar.");
  }

  const price = Math.round(Number(newPrice));
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Introdu un preț valid (număr ≥ 0).");
  }

  const effective = await refreshMenuPrices();
  effective[canonical] = price;

  const payload = {
    prices: Object.fromEntries(
      MENU_PRODUCTS.filter((product) => !product.priceFromGrillMin).map((product) => [
        product.id,
        effective[product.id],
      ])
    ),
    updatedAt: Date.now(),
  };

  await setDoc(PRICES_REF, payload);
  return { prices: effective, updatedAt: payload.updatedAt };
}

export function applyMenuPricesToDocument(pricesMap) {
  document.querySelectorAll(".menu-item").forEach((item) => {
    const nameEl = item.querySelector(".menu-item__name");
    const priceEl = item.querySelector(".menu-item__price");
    if (!nameEl || !priceEl) return;

    const name = nameEl.textContent.trim();
    const detail = item.querySelector(".menu-item__detail")?.textContent.trim() || "";
    const productKey =
      item.getAttribute("data-product") || PRODUCT_KEY_BY_NAME[name] || "";
    const menuId = getMenuId(productKey, name, detail);
    const meta = getMenuItemMeta(menuId);
    const price = getEffectivePrice(menuId, pricesMap);
    if (price == null) return;

    priceEl.textContent = formatMenuPriceLabel(price, meta);
    item.dataset.menuPrice = String(price);
  });
}
