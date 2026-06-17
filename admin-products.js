import { MENU_PRODUCTS } from "./menu-catalog.js";
import {
  subscribeMenuAvailability,
  toggleProductAvailability,
} from "./menu-availability.js";

let unavailableIds = new Set();
let unsubscribe = null;
let started = false;

function escapeHtml(text) {
  return text
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

function renderProductsList() {
  const list = document.getElementById("products-list");
  if (!list) return;

  const groups = groupProductsByCategory();
  list.innerHTML = "";

  groups.forEach((products, category) => {
    const section = document.createElement("section");
    section.className = "products-group";
    section.innerHTML = `<h2 class="products-group__title">${escapeHtml(category)}</h2>`;

    const rows = document.createElement("div");
    rows.className = "products-group__list";

    products.forEach((product) => {
      const unavailable = unavailableIds.has(product.id);
      const row = document.createElement("div");
      row.className = `product-row${unavailable ? " product-row--unavailable" : ""}`;
      row.innerHTML = `
        <div class="product-row__info">
          <span class="product-row__name">${escapeHtml(product.name)}</span>
          <span class="product-row__detail">${escapeHtml(product.detail)}</span>
        </div>
        <button
          type="button"
          class="product-row__toggle${unavailable ? " product-row__toggle--active" : ""}"
          data-menu-id="${product.id}"
        >
          ${unavailable ? "Indisponibil" : "Disponibil"}
        </button>
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
    const button = event.target.closest("[data-menu-id]");
    if (!button) return;

    const menuId = button.dataset.menuId;
    button.disabled = true;

    try {
      await toggleProductAvailability(menuId);
    } catch (err) {
      console.error(err);
      alert("Nu am putut actualiza produsul.");
    } finally {
      button.disabled = false;
    }
  });
}

export function startProductsPanel() {
  if (started) return;
  started = true;

  initProductActions();

  if (unsubscribe) unsubscribe();
  unsubscribe = subscribeMenuAvailability((ids) => {
    unavailableIds = ids;
    renderProductsList();
  });
}

export function stopProductsPanel() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  started = false;
}
