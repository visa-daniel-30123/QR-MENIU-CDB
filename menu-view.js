import {
  applyMenuLanguage,
  initLangSwitcher,
  onLangChange,
  t,
  getLang,
} from "./menu-i18n.js?v=1";
import { getMenuId, isMenuIdUnavailable } from "./menu-catalog.js?v=8";
import { subscribeMenuAvailability, refreshMenuAvailability } from "./menu-availability.js?v=8";
import {
  subscribeMenuPrices,
  refreshMenuPrices,
  applyMenuPricesToDocument,
  buildEffectivePrices,
} from "./menu-prices.js?v=9";

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
let menuPricesReady = false;

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
        badge.textContent = t("badge.unavailable");
        item.querySelector(".menu-item__content")?.appendChild(badge);
      }
    } else if (badge) {
      badge.remove();
    }
  });
}

function onMenuPricesUpdated(prices, updatedAt = Date.now(), meta = {}) {
  if (meta.fromCache && menuPricesReady) return;
  if (updatedAt < lastPricesUpdatedAt) return;
  if (updatedAt > 0) lastPricesUpdatedAt = updatedAt;
  menuPrices = prices;
  applyMenuPricesToDocument(menuPrices);
  applyMenuAvailability();
}

async function init() {
  try {
    const prices = await refreshMenuPrices();
    onMenuPricesUpdated(prices, Date.now(), { fromCache: false });
  } catch (err) {
    console.warn("initial menu prices:", err);
    onMenuPricesUpdated(buildEffectivePrices(), 0, { fromCache: false });
  }

  menuPricesReady = true;
  document.body.classList.remove("menu-prices-pending");

  applyMenuAvailability();
  applyMenuLanguage(getLang());
  initLangSwitcher();
  onLangChange(() => {
    applyMenuLanguage(getLang());
    applyMenuAvailability();
  });

  subscribeMenuPrices((prices, updatedAt, meta) => {
    onMenuPricesUpdated(prices, updatedAt, meta);
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
      .then((prices) => onMenuPricesUpdated(prices, Date.now(), { fromCache: false }))
      .catch((err) => console.warn("refresh menu prices:", err));
  });
}

init();
