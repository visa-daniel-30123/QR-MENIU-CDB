import {
  MENU_PRODUCTS,
  isMenuIdUnavailable,
  getMenuItemMeta,
} from "./menu-catalog.js?v=8";
import {
  subscribeMenuAvailability,
  toggleProductAvailability,
} from "./menu-availability.js?v=8";
import {
  subscribeMenuPrices,
  updateProductPrice,
  getEffectivePrice,
  buildEffectivePrices,
} from "./menu-prices.js?v=9";

let unavailableIds = new Set();
let menuPrices = buildEffectivePrices();
let lastStockUpdatedAt = 0;
let lastPricesUpdatedAt = 0;
let editingPriceId = null;
let unsubscribeAvailability = null;
let unsubscribePrices = null;
let started = false;

function showProductsStatus(message, isError = false) {
  const status = document.getElementById("products-status");
  if (!status) return;
  status.textContent = message;
  status.hidden = false;
  status.classList.toggle("products-status--error", isError);
}

function showProductsError(message) {
  const list = document.getElementById("products-list");
  if (!list) return;
  list.innerHTML = `<p class="products-empty products-empty--error">${escapeHtml(message)}</p>`;
}

function formatFirestoreError(err) {
  const code = err?.code ? String(err.code) : "";
  const message = err?.message ? String(err.message) : "Eroare necunoscută";
  return `${code ? `${code}: ` : ""}${message}`;
}

function isPermissionError(err) {
  const text = `${err?.code || ""} ${err?.message || ""}`.toLowerCase();
  return text.includes("permission") || text.includes("insufficient");
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function groupProductsByCategory() {
  const groups = new Map();
  MENU_PRODUCTS.forEach((product) => {
    if (!groups.has(product.category)) {
      groups.set(product.category, []);
    }
    groups.get(product.category).push(product);
  });
  return groups;
}

function renderPriceEditor(product, currentPrice) {
  return `
    <div class="product-row__price-edit" data-price-editor="${product.id}">
      <p class="product-row__price-hint">Preț actual: <strong>${currentPrice} lei</strong></p>
      <label class="product-row__price-field">
        Preț nou (lei)
        <input
          type="number"
          min="0"
          step="1"
          class="product-row__price-input"
          data-price-input="${product.id}"
          value="${currentPrice}"
        >
      </label>
      <div class="product-row__price-actions">
        <button type="button" class="product-row__price-save" data-action="save-price" data-menu-id="${product.id}">
          Salvează preț
        </button>
        <button type="button" class="product-row__price-cancel" data-action="cancel-price">
          Anulează
        </button>
      </div>
    </div>
  `;
}

function renderProductsList() {
  const list = document.getElementById("products-list");
  if (!list) return;

  const groups = groupProductsByCategory();
  list.innerHTML = "";

  if (MENU_PRODUCTS.length === 0) {
    list.innerHTML = '<p class="products-empty">Nu există produse în catalog.</p>';
    return;
  }

  groups.forEach((products, category) => {
    const section = document.createElement("section");
    section.className = "products-group";
    section.innerHTML = `<h2 class="products-group__title">${escapeHtml(category)}</h2>`;

    const rows = document.createElement("div");
    rows.className = "products-group__list";

    products.forEach((product) => {
      const unavailable = isMenuIdUnavailable(product.id, unavailableIds);
      const meta = getMenuItemMeta(product.id);
      const currentPrice = getEffectivePrice(product.id, menuPrices);
      const isEditing = editingPriceId === product.id;

      const row = document.createElement("div");
      row.className = `product-row${unavailable ? " product-row--unavailable" : ""}${isEditing ? " product-row--editing-price" : ""}`;
      row.innerHTML = `
        <div class="product-row__main">
          <div class="product-row__info">
            <span class="product-row__name">${escapeHtml(product.name)}</span>
            <span class="product-row__detail">${escapeHtml(product.detail)}</span>
            ${unavailable ? '<span class="product-row__status">Indisponibil acum</span>' : ""}
          </div>
          <div class="product-row__actions">
            ${
              product.priceFromGrillMin
                ? `<span class="product-row__price product-row__price--auto" title="Se actualizează automat când modifici mici / cârnăciori / ceafă">de la ${currentPrice ?? "—"} lei</span>`
                : `<button type="button" class="product-row__price-btn" data-action="edit-price" data-menu-id="${product.id}">Preț: ${currentPrice} lei</button>`
            }
            <button
              type="button"
              class="product-row__toggle${unavailable ? " product-row__toggle--restore" : " product-row__toggle--block"}"
              data-action="toggle-stock"
              data-menu-id="${product.id}"
            >
              ${unavailable ? "Pune disponibil" : "Marchează indisponibil"}
            </button>
          </div>
        </div>
        ${isEditing && currentPrice != null ? renderPriceEditor(product, currentPrice) : ""}
      `;
      rows.appendChild(row);
    });

    section.appendChild(rows);
    list.appendChild(section);
  });
}

function initProductActions() {
  const list = document.getElementById("products-list");
  list?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;

    if (action === "edit-price") {
      editingPriceId = button.dataset.menuId;
      renderProductsList();
      const input = list.querySelector(`[data-price-input="${editingPriceId}"]`);
      input?.focus();
      input?.select();
      return;
    }

    if (action === "cancel-price") {
      editingPriceId = null;
      renderProductsList();
      return;
    }

    if (action === "save-price") {
      const menuId = button.dataset.menuId;
      const input = list.querySelector(`[data-price-input="${menuId}"]`);
      if (!input) return;

      button.disabled = true;
      try {
        const result = await updateProductPrice(menuId, input.value);
        menuPrices = result.prices;
        lastPricesUpdatedAt = result.updatedAt;
        editingPriceId = null;
        renderProductsList();
        showProductsStatus("Preț actualizat — se sincronizează pe toate meniurile.");
      } catch (err) {
        console.error(err);
        if (isPermissionError(err)) {
          alert(
            "Firebase blochează salvarea pe proiectul qr-cdb.\n\nVerifică regulile Firestore (menu + settings)."
          );
        } else {
          alert(`Nu am putut salva prețul:\n${formatFirestoreError(err)}`);
        }
      } finally {
        button.disabled = false;
      }
      return;
    }

    if (action === "toggle-stock") {
      const menuId = button.dataset.menuId;
      button.disabled = true;

      try {
        const result = await toggleProductAvailability(menuId, unavailableIds);
        unavailableIds = result.ids;
        lastStockUpdatedAt = result.updatedAt;
        renderProductsList();
      } catch (err) {
        console.error(err);
        if (isPermissionError(err)) {
          alert(
            "Firebase blochează salvarea pe proiectul qr-cdb.\n\nVerifică regulile Firestore (menu + settings)."
          );
        } else {
          alert(`Nu am putut actualiza produsul:\n${formatFirestoreError(err)}`);
        }
      } finally {
        button.disabled = false;
      }
    }
  });
}

export function startProductsPanel() {
  if (started) return;
  started = true;

  initProductActions();
  renderProductsList();

  if (unsubscribeAvailability) unsubscribeAvailability();
  unsubscribeAvailability = subscribeMenuAvailability(
    (ids, updatedAt) => {
      if (updatedAt < lastStockUpdatedAt) return;
      lastStockUpdatedAt = updatedAt;
      unavailableIds = ids;
      renderProductsList();
    },
    (err) => {
      showProductsError(
        `Nu pot citi stocul din Firebase: ${formatFirestoreError(err)}. Verifică regulile Firestore (menu + settings).`
      );
      showProductsStatus("Stocul nu e sincronizat — verifică regulile Firebase.", true);
    }
  );

  if (unsubscribePrices) unsubscribePrices();
  unsubscribePrices = subscribeMenuPrices(
    (prices, updatedAt) => {
      if (updatedAt < lastPricesUpdatedAt) return;
      if (updatedAt > 0) lastPricesUpdatedAt = updatedAt;
      menuPrices = prices;
      renderProductsList();
      if (updatedAt > 0) {
        showProductsStatus("Stoc și prețuri sincronizate — actualizare live pe toate meniurile.");
      }
    },
    (err) => {
      console.warn("menu prices subscribe:", err);
    }
  );
}

export function stopProductsPanel() {
  if (unsubscribeAvailability) {
    unsubscribeAvailability();
    unsubscribeAvailability = null;
  }
  if (unsubscribePrices) {
    unsubscribePrices();
    unsubscribePrices = null;
  }
  started = false;
}
