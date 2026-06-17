import { MENU_PRODUCTS } from "./menu-catalog.js";
import {
  subscribeMenuAvailability,
  toggleProductAvailability,
} from "./menu-availability.js";

let unavailableIds = new Set();
let unsubscribe = null;
let started = false;

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
      const unavailable = unavailableIds.has(product.id);
      const row = document.createElement("div");
      row.className = `product-row${unavailable ? " product-row--unavailable" : ""}`;
      row.innerHTML = `
        <div class="product-row__info">
          <span class="product-row__name">${escapeHtml(product.name)}</span>
          <span class="product-row__detail">${escapeHtml(product.detail)}</span>
          ${unavailable ? '<span class="product-row__status">Indisponibil acum</span>' : ""}
        </div>
        <button
          type="button"
          class="product-row__toggle${unavailable ? " product-row__toggle--restore" : " product-row__toggle--block"}"
          data-menu-id="${product.id}"
        >
          ${unavailable ? "Pune disponibil" : "Marchează indisponibil"}
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
      const nextIds = await toggleProductAvailability(menuId, unavailableIds);
      unavailableIds = nextIds;
      renderProductsList();
    } catch (err) {
      console.error(err);
      if (isPermissionError(err)) {
        alert(
          "Firebase blochează salvarea.\n\nÎn Firebase Console → Firestore → Rules, adaugă:\n\nmatch /menu/{docId} {\n  allow read, write: if true;\n}\n\nApoi Publish și reîncarcă pagina."
        );
      } else {
        alert(`Nu am putut actualiza produsul:\n${formatFirestoreError(err)}`);
      }
    } finally {
      button.disabled = false;
    }
  });
}

export function startProductsPanel() {
  if (started) return;
  started = true;

  initProductActions();
  renderProductsList();

  if (unsubscribe) unsubscribe();
  unsubscribe = subscribeMenuAvailability(
    (ids) => {
      unavailableIds = ids;
      renderProductsList();
    },
    (err) => {
      showProductsError(
        `Nu pot citi stocul din Firebase: ${formatFirestoreError(err)}. Verifică regulile Firestore pentru colecția menu.`
      );
    }
  );
}

export function stopProductsPanel() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  started = false;
}
