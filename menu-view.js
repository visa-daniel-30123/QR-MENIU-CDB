import { getMenuId, isMenuIdUnavailable } from "./menu-catalog.js?v=6";
import { subscribeMenuAvailability, refreshMenuAvailability } from "./menu-availability.js?v=6";
import {
  subscribeMenuPrices,
  refreshMenuPrices,
  applyMenuPricesToDocument,
  buildEffectivePrices,
} from "./menu-prices.js?v=6";

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

let unavailableIds = new Set();
let menuPrices = buildEffectivePrices();
let lastStockUpdatedAt = 0;
let lastPricesUpdatedAt = 0;

function applyMenuAvailability() {
  document.querySelectorAll(".menu-item").forEach((item) => {
    const nameEl = item.querySelector(".menu-item__name");
    const priceEl = item.querySelector(".menu-item__price");
    if (!nameEl || !priceEl) return;

    const name = nameEl.textContent.trim();
    const detail = item.querySelector(".menu-item__detail")?.textContent.trim() || "";
    const productKey =
      item.getAttribute("data-product") || PRODUCT_KEY_BY_NAME[name] || "";
    const menuId = getMenuId(productKey, name, detail);
    item.dataset.menuId = menuId;

    const unavailable = isMenuIdUnavailable(menuId, unavailableIds);
    item.classList.toggle("menu-item--unavailable", unavailable);

    let badge = item.querySelector(".menu-item__badge");
    if (unavailable) {
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "menu-item__badge";
        badge.textContent = "Indisponibil";
        item.querySelector(".menu-item__content")?.appendChild(badge);
      }
    } else if (badge) {
      badge.remove();
    }
  });
}

function onMenuPricesUpdated(prices, updatedAt = Date.now()) {
  if (updatedAt < lastPricesUpdatedAt) return;
  if (updatedAt > 0) lastPricesUpdatedAt = updatedAt;
  menuPrices = prices;
  applyMenuPricesToDocument(menuPrices);
  applyMenuAvailability();
}

function init() {
  applyMenuPricesToDocument(menuPrices);

  subscribeMenuPrices((prices, updatedAt) => {
    onMenuPricesUpdated(prices, updatedAt);
  });

  subscribeMenuAvailability((ids, updatedAt) => {
    if (updatedAt < lastStockUpdatedAt) return;
    lastStockUpdatedAt = updatedAt;
    unavailableIds = ids;
    applyMenuAvailability();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    refreshMenuAvailability()
      .then((ids) => {
        unavailableIds = ids;
        applyMenuAvailability();
      })
      .catch((err) => console.warn("refresh menu availability:", err));
    refreshMenuPrices()
      .then((prices) => onMenuPricesUpdated(prices))
      .catch((err) => console.warn("refresh menu prices:", err));
  });
}

init();
