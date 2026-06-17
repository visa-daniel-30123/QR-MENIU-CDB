import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db, isFirebaseConfigured } from "./firebase-app.js";
import { getMenuId } from "./menu-catalog.js";
import { subscribeMenuAvailability, refreshMenuAvailability } from "./menu-availability.js";

const FRIES_PRICE = 6;
const BREAD_PRICE = 1;
const MAX_SAUCES = 2;
const TABLE_COUNT = 6;
const TABLE_STORAGE_KEY = "cdb-table-number";

const PRODUCT_OPTIONS = {
  "meniu-aripioare": { type: "sauce" },
  "meniu-crispy": { type: "sauce" },
  "meniu-cascaval": { type: "sauce" },
  "hot-dog": { type: "sauces" },
  mici: { type: "grill", unitPrice: 5, pieceLabel: "mici" },
  ceafa: { type: "grill", unitPrice: 20, pieceLabel: "porții" },
  carnaciori: { type: "grill", unitPrice: 5, pieceLabel: "cârnăciori" },
};

const SAUCES = ["Ketchup", "Muștar", "Maioneză", "Usturoi"];

const cart = new Map();
let pendingProduct = null;
let editingCartId = null;
let cartExpanded = false;
let qrTableNumber = null;
let unavailableIds = new Set();

const PRODUCT_KEY_BY_NAME = {
  "Meniu Aripioare": "meniu-aripioare",
  "Meniu Crispy": "meniu-crispy",
  "Meniu Cașcaval Pane": "meniu-cascaval",
  "Hot Dog": "hot-dog",
  Mici: "mici",
  Ceafă: "ceafa",
  Cârnăciori: "carnaciori",
};

const els = {
  cartTop: document.getElementById("cart-top"),
  cartToggle: document.getElementById("cart-toggle"),
  cartSummary: document.getElementById("cart-summary"),
  cartTopBody: document.getElementById("cart-top-body"),
  list: document.getElementById("cart-list"),
  checkoutOpenBtn: document.getElementById("cart-checkout-open"),
  checkoutBackdrop: document.getElementById("checkout-backdrop"),
  checkoutModal: document.getElementById("checkout-modal"),
  total: document.getElementById("cart-total"),
  form: document.getElementById("cart-form"),
  submit: document.getElementById("cart-submit"),
  success: document.getElementById("cart-success"),
  error: document.getElementById("cart-error"),
  optionsModal: document.getElementById("options-modal"),
  optionsBackdrop: document.getElementById("options-backdrop"),
  optionsTitle: document.getElementById("options-title"),
  optionsBody: document.getElementById("options-body"),
  optionsError: document.getElementById("options-error"),
  optionsPrice: document.getElementById("options-price"),
  optionsConfirm: document.getElementById("options-confirm"),
  optionsCancel: document.getElementById("options-cancel"),
  optionsClose: document.getElementById("options-close"),
};

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parsePrice(text) {
  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function lineTotal(item) {
  if (item.linePrice != null) return item.linePrice * item.qty;
  return item.price * item.qty;
}

function cartCount() {
  let count = 0;
  cart.forEach((item) => {
    count += item.qty;
  });
  return count;
}

function cartTotal() {
  let total = 0;
  cart.forEach((item) => {
    total += lineTotal(item);
  });
  return total;
}

function parseOptionsFromDetail(detail, config) {
  if (!detail) return {};

  if (config.type === "sauce" || config.type === "sauces") {
    const sauceMatch = detail.match(/Sos:\s*(.+?)(?:\s*·|$)/);
    const parsed = {
      sauces: sauceMatch
        ? sauceMatch[1].split(",").map((sauce) => sauce.trim()).filter(Boolean)
        : [],
    };
    if (config.type === "sauce") {
      parsed.withBread = detail.includes("+ pâine");
    }
    return parsed;
  }

  const piecesMatch = detail.match(/^(\d+)\s*buc/);
  const sauceMatch = detail.match(/Sos:\s*(.+)$/);
  return {
    pieces: piecesMatch ? Number(piecesMatch[1]) : 1,
    withFries: detail.includes("cartofi"),
    withBread: detail.includes("+ pâine"),
    sauces: sauceMatch
      ? sauceMatch[1].split(",").map((sauce) => sauce.trim()).filter(Boolean)
      : [],
  };
}

function finalizeCartProduct(product) {
  let qty = 1;

  if (editingCartId) {
    const previous = cart.get(editingCartId);
    if (previous) qty = previous.qty;
    cart.delete(editingCartId);
    editingCartId = null;
  }

  const existing = cart.get(product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.set(product.id, { ...product, qty });
  }

  renderCart();
  els.cartTop.classList.add("cart-top--pulse");
  setTimeout(() => els.cartTop.classList.remove("cart-top--pulse"), 400);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseTableParam() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("masa") || params.get("table");
  if (!raw) return null;

  const tableNumber = Number.parseInt(raw, 10);
  if (Number.isNaN(tableNumber) || tableNumber < 1 || tableNumber > TABLE_COUNT) {
    return null;
  }

  return String(tableNumber);
}

function initTableFromQr() {
  const fromUrl = parseTableParam();
  if (fromUrl) {
    sessionStorage.setItem(TABLE_STORAGE_KEY, fromUrl);
    qrTableNumber = fromUrl;
  } else {
    qrTableNumber = sessionStorage.getItem(TABLE_STORAGE_KEY);
    if (qrTableNumber) {
      const url = new URL(window.location.href);
      if (!url.searchParams.get("masa") && !url.searchParams.get("table")) {
        url.searchParams.set("masa", qrTableNumber);
        window.history.replaceState({}, "", `${url.pathname}?${url.searchParams.toString()}${url.hash}`);
      }
    }
  }

  applyTableUi();
}

function applyTableUi() {
  const tableLabel = document.getElementById("checkout-table-label");
  const tableInput = els.form?.querySelector('[name="table"]');
  const tableBadge = document.getElementById("table-badge");
  const headerBadge = document.getElementById("header-table-badge");

  if (qrTableNumber) {
    if (tableInput) {
      tableInput.value = qrTableNumber;
      tableInput.hidden = true;
    }
    if (tableLabel) tableLabel.hidden = true;
    if (tableBadge) {
      tableBadge.textContent = `Comandă pentru masa ${qrTableNumber}`;
      tableBadge.hidden = false;
    }
    if (headerBadge) {
      headerBadge.textContent = `Masă ${qrTableNumber}`;
      headerBadge.hidden = false;
    }
    return;
  }

  if (tableInput) tableInput.hidden = false;
  if (tableLabel) tableLabel.hidden = false;
  if (tableBadge) tableBadge.hidden = true;
  if (headerBadge) headerBadge.hidden = true;
}

function setCartExpanded(open) {
  cartExpanded = open;
  els.cartTopBody.hidden = !open;
  els.cartToggle.setAttribute("aria-expanded", open ? "true" : "false");
  els.cartTop.classList.toggle("cart-top--open", open);
}

function openCheckout() {
  if (cart.size === 0) return;
  const totalEl = document.getElementById("cart-total");
  if (totalEl) totalEl.textContent = `${cartTotal()} lei`;

  els.checkoutBackdrop.hidden = false;
  els.success.hidden = true;

  if (!isFirebaseConfigured()) {
    els.error.textContent =
      "Comenzile online nu sunt disponibile momentan. Contactează ospătarul.";
    els.error.hidden = false;
    els.submit.disabled = true;
  } else {
    els.error.hidden = true;
    els.submit.disabled = false;
  }

  applyTableUi();
  els.checkoutModal.showModal();
}

function closeCheckout() {
  els.checkoutBackdrop.hidden = true;
  els.checkoutModal.close();
  els.success.hidden = true;
  els.error.hidden = true;
  setTimeout(() => closeCartOptionsAndErrors(), 0);
}

function closeCartOptionsAndErrors() {
  // placeholder: keep UI stable; cart errors are shown per submit.
}

function renderCart() {
  const items = [...cart.values()];
  const count = cartCount();
  const total = cartTotal();
  const hasItems = items.length > 0;

  els.cartTop.hidden = false;
  if (els.checkoutOpenBtn) els.checkoutOpenBtn.disabled = !hasItems;
  els.list.innerHTML = "";

  if (!hasItems) {
    els.total.textContent = "0 lei";
    els.cartSummary.textContent = "0 produse · 0 lei";
    setCartExpanded(false);
    return;
  }

  const label = count === 1 ? "1 produs" : `${count} produse`;
  els.cartSummary.textContent = `${label} · ${total} lei`;
  els.total.textContent = `${total} lei`;

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-item";
    const canEdit = item.customizable && (item.productKey || PRODUCT_KEY_BY_NAME[item.name]);
    row.innerHTML = `
      <div class="cart-item__info">
        <span class="cart-item__name">${escapeHtml(item.name)}</span>
        ${item.detail ? `<span class="cart-item__detail">${escapeHtml(item.detail)}</span>` : ""}
        ${canEdit ? `<button type="button" class="cart-item__edit" data-action="edit" data-id="${item.id}">Editează</button>` : ""}
      </div>
      <div class="cart-item__controls">
        <button type="button" class="cart-item__qty-btn" data-action="dec" data-id="${item.id}" aria-label="Mai puțin">−</button>
        <span class="cart-item__qty">${item.qty}</span>
        <button type="button" class="cart-item__qty-btn" data-action="inc" data-id="${item.id}" aria-label="Mai mult">+</button>
      </div>
      <span class="cart-item__price">${lineTotal(item)} lei</span>
    `;
    els.list.appendChild(row);
  });

  if (!isFirebaseConfigured()) {
    els.error.textContent =
      "Comenzile online nu sunt disponibile momentan. Contactează ospătarul.";
    els.error.hidden = false;
    els.submit.disabled = true;
  } else {
    els.error.hidden = true;
    els.submit.disabled = false;
  }
}

function addToCart(product) {
  const existing = cart.get(product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.set(product.id, { ...product, qty: 1 });
  }
  renderCart();
  els.cartTop.classList.add("cart-top--pulse");
  setTimeout(() => els.cartTop.classList.remove("cart-top--pulse"), 400);
}

function changeQty(id, delta) {
  const item = cart.get(id);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    cart.delete(id);
  }
  renderCart();
}

function closeOptionsModal() {
  els.optionsModal.close();
  els.optionsBackdrop.hidden = true;
  els.optionsError.hidden = true;
  pendingProduct = null;
  editingCartId = null;
  els.optionsConfirm.textContent = "Adaugă în coș";
}

function bindSauceLimit(selector) {
  els.optionsBody.querySelectorAll(selector).forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const checked = els.optionsBody.querySelectorAll(`${selector}:checked`);
      if (checked.length > MAX_SAUCES) {
        checkbox.checked = false;
        els.optionsError.textContent = `Poți alege maximum ${MAX_SAUCES} sosuri.`;
        els.optionsError.hidden = false;
      } else {
        els.optionsError.hidden = true;
      }
    });
  });
}

function getInitialSauces(init) {
  if (init.sauces?.length) return init.sauces;
  if (init.sauce) return [init.sauce];
  return [];
}

function renderSauceOptions() {
  const init = pendingProduct.editOptions || {};
  const selectedSauces = getInitialSauces(init);

  els.optionsBody.innerHTML = `
    <p class="options-modal__hint">Alege până la ${MAX_SAUCES} sosuri:</p>
    <fieldset class="options-group">
      <legend class="visually-hidden">Sosuri</legend>
      ${SAUCES.map(
        (sauce) => `
        <label class="options-choice">
          <input type="checkbox" name="menu-sauce" value="${sauce}" ${selectedSauces.includes(sauce) ? "checked" : ""}>
          <span>${sauce}</span>
        </label>`
      ).join("")}
    </fieldset>
    <label class="options-check">
      <input type="checkbox" id="menu-bread" ${init.withBread ? "checked" : ""}>
      <span>Vrei și pâine? <strong>+${BREAD_PRICE} leu</strong></span>
    </label>
  `;

  const updateMenuPrice = () => {
    const withBread = document.getElementById("menu-bread")?.checked;
    const price = pendingProduct.price + (withBread ? BREAD_PRICE : 0);
    els.optionsPrice.textContent = `${price} lei`;
  };

  bindSauceLimit('input[name="menu-sauce"]');
  document.getElementById("menu-bread").addEventListener("change", updateMenuPrice);
  updateMenuPrice();
}

function renderSaucesOnlyOptions() {
  const init = pendingProduct.editOptions || {};
  const selectedSauces = getInitialSauces(init);

  els.optionsBody.innerHTML = `
    <p class="options-modal__hint">Alege până la ${MAX_SAUCES} sosuri:</p>
    <fieldset class="options-group">
      <legend class="visually-hidden">Sosuri</legend>
      ${SAUCES.map(
        (sauce) => `
        <label class="options-choice">
          <input type="checkbox" name="product-sauce" value="${sauce}" ${selectedSauces.includes(sauce) ? "checked" : ""}>
          <span>${sauce}</span>
        </label>`
      ).join("")}
    </fieldset>
  `;

  bindSauceLimit('input[name="product-sauce"]');
  els.optionsPrice.textContent = `${pendingProduct.price} lei`;
}

function renderGrillOptions(config) {
  const init = pendingProduct.editOptions || {};

  els.optionsBody.innerHTML = `
    <p class="options-modal__hint">Câte bucăți dorești?</p>
    <div class="options-stepper">
      <button type="button" class="options-stepper__btn" data-step="-1" aria-label="Mai puține">−</button>
      <input type="number" class="options-stepper__input" id="grill-pieces" value="${init.pieces || 1}" min="1" max="30" inputmode="numeric">
      <button type="button" class="options-stepper__btn" data-step="1" aria-label="Mai multe">+</button>
      <span class="options-stepper__label">${config.pieceLabel}</span>
    </div>
    <label class="options-check">
      <input type="checkbox" id="grill-fries" ${init.withFries ? "checked" : ""}>
      <span>Vrei și cartofi prăjiți? <strong>+${FRIES_PRICE} lei</strong></span>
    </label>
    <label class="options-check">
      <input type="checkbox" id="grill-bread" ${init.withBread ? "checked" : ""}>
      <span>Vrei și pâine? <strong>+${BREAD_PRICE} leu</strong></span>
    </label>
    <p class="options-modal__hint">Alege până la ${MAX_SAUCES} sosuri (opțional):</p>
    <fieldset class="options-group">
      <legend class="visually-hidden">Sosuri</legend>
      ${SAUCES.map(
        (sauce) => `
        <label class="options-choice">
          <input type="checkbox" name="grill-sauce" value="${sauce}" ${(init.sauces || []).includes(sauce) ? "checked" : ""}>
          <span>${sauce}</span>
        </label>`
      ).join("")}
    </fieldset>
  `;

  const updateGrillPrice = () => {
    els.optionsPrice.textContent = `${calcGrillPrice(config)} lei`;
  };

  els.optionsBody.querySelectorAll("[data-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById("grill-pieces");
      const next = Math.min(30, Math.max(1, Number(input.value) + Number(btn.dataset.step)));
      input.value = String(next);
      updateGrillPrice();
    });
  });

  document.getElementById("grill-pieces").addEventListener("input", updateGrillPrice);
  document.getElementById("grill-fries").addEventListener("change", updateGrillPrice);
  document.getElementById("grill-bread").addEventListener("change", updateGrillPrice);

  bindSauceLimit('input[name="grill-sauce"]');

  updateGrillPrice();
}

function calcGrillPrice(config) {
  const pieces = Math.min(30, Math.max(1, Number(document.getElementById("grill-pieces")?.value || 1)));
  const withFries = document.getElementById("grill-fries")?.checked;
  const withBread = document.getElementById("grill-bread")?.checked;
  return (
    pieces * config.unitPrice +
    (withFries ? FRIES_PRICE : 0) +
    (withBread ? BREAD_PRICE : 0)
  );
}

function openOptionsModal(productKey, baseProduct) {
  const config = PRODUCT_OPTIONS[productKey];
  if (!config) return;

  editingCartId = null;
  pendingProduct = { ...baseProduct, productKey };
  els.optionsTitle.textContent = baseProduct.name;
  els.optionsError.hidden = true;
  els.optionsConfirm.textContent = "Adaugă în coș";

  if (config.type === "sauce") {
    renderSauceOptions();
  } else if (config.type === "sauces") {
    renderSaucesOnlyOptions();
  } else {
    renderGrillOptions(config);
  }

  els.optionsBackdrop.hidden = false;
  els.optionsModal.showModal();
}

function openEditModal(item) {
  const productKey = item.productKey || PRODUCT_KEY_BY_NAME[item.name];
  const config = PRODUCT_OPTIONS[productKey];
  if (!config) return;

  editingCartId = item.id;
  pendingProduct = {
    name: item.name,
    price: item.price,
    productKey,
    editOptions: item.options || parseOptionsFromDetail(item.detail, config),
  };
  els.optionsTitle.textContent = item.name;
  els.optionsError.hidden = true;
  els.optionsConfirm.textContent = "Salvează";

  if (config.type === "sauce") {
    renderSauceOptions();
  } else if (config.type === "sauces") {
    renderSaucesOnlyOptions();
  } else {
    renderGrillOptions(config);
  }

  els.optionsBackdrop.hidden = false;
  els.optionsModal.showModal();
}

function confirmOptions() {
  if (!pendingProduct) return;

  const config = PRODUCT_OPTIONS[pendingProduct.productKey];

  if (config.type === "sauce") {
    const sauces = [...els.optionsBody.querySelectorAll('input[name="menu-sauce"]:checked')].map(
      (input) => input.value
    );

    if (sauces.length === 0) {
      els.optionsError.textContent = "Alege cel puțin un sos.";
      els.optionsError.hidden = false;
      return;
    }

    if (sauces.length > MAX_SAUCES) {
      els.optionsError.textContent = `Poți alege maximum ${MAX_SAUCES} sosuri.`;
      els.optionsError.hidden = false;
      return;
    }

    const withBread = document.getElementById("menu-bread")?.checked;
    const detailParts = [`Sos: ${sauces.join(", ")}`];
    if (withBread) detailParts.push("+ pâine");

    const detail = detailParts.join(" · ");
    const linePrice = pendingProduct.price + (withBread ? BREAD_PRICE : 0);
    const id = slugify(
      `${pendingProduct.name}-${sauces.join("-")}-${withBread ? "bread" : "nobread"}`
    );
    const options = { sauces, withBread };

    finalizeCartProduct({
      id,
      name: pendingProduct.name,
      detail,
      price: pendingProduct.price,
      linePrice,
      productKey: pendingProduct.productKey,
      options,
      customizable: true,
    });
  } else if (config.type === "sauces") {
    const sauces = [...els.optionsBody.querySelectorAll('input[name="product-sauce"]:checked')].map(
      (input) => input.value
    );

    if (sauces.length === 0) {
      els.optionsError.textContent = "Alege cel puțin un sos.";
      els.optionsError.hidden = false;
      return;
    }

    if (sauces.length > MAX_SAUCES) {
      els.optionsError.textContent = `Poți alege maximum ${MAX_SAUCES} sosuri.`;
      els.optionsError.hidden = false;
      return;
    }

    const detail = `Sos: ${sauces.join(", ")}`;
    const id = slugify(`${pendingProduct.name}-${sauces.join("-")}`);
    const options = { sauces };

    finalizeCartProduct({
      id,
      name: pendingProduct.name,
      detail,
      price: pendingProduct.price,
      linePrice: pendingProduct.price,
      productKey: pendingProduct.productKey,
      options,
      customizable: true,
    });
  } else {
    const pieces = Math.min(30, Math.max(1, Number(document.getElementById("grill-pieces").value)));
    const withFries = document.getElementById("grill-fries").checked;
    const withBread = document.getElementById("grill-bread").checked;
    const sauces = [...els.optionsBody.querySelectorAll('input[name="grill-sauce"]:checked')].map(
      (input) => input.value
    );

    if (sauces.length > MAX_SAUCES) {
      els.optionsError.textContent = `Poți alege maximum ${MAX_SAUCES} sosuri.`;
      els.optionsError.hidden = false;
      return;
    }

    const linePrice =
      pieces * config.unitPrice +
      (withFries ? FRIES_PRICE : 0) +
      (withBread ? BREAD_PRICE : 0);

    const detailParts = [`${pieces} buc.`];
    if (withFries) detailParts.push("+ cartofi prăjiți");
    if (withBread) detailParts.push("+ pâine");
    if (sauces.length) detailParts.push(`Sos: ${sauces.join(", ")}`);

    const detail = detailParts.join(" · ");
    const id = slugify(
      `${pendingProduct.name}-${pieces}-${withFries ? "fries" : "nofries"}-${withBread ? "bread" : "nobread"}-${sauces.join("-") || "nosauce"}`
    );
    const options = { pieces, withFries, withBread, sauces };

    finalizeCartProduct({
      id,
      name: pendingProduct.name,
      detail,
      price: config.unitPrice,
      linePrice,
      productKey: pendingProduct.productKey,
      options,
      customizable: true,
    });
  }

  closeOptionsModal();
}

function initMenuButtons() {
  document.querySelectorAll(".menu-item").forEach((item) => {
    const nameEl = item.querySelector(".menu-item__name");
    const detailEl = item.querySelector(".menu-item__detail");
    const priceEl = item.querySelector(".menu-item__price");

    if (!nameEl || !priceEl) return;

    const name = nameEl.textContent.trim();
    const detail = detailEl ? detailEl.textContent.trim() : "";
    const price = parsePrice(priceEl.textContent);
    const productKey = item.dataset.product || "";
    const menuId = getMenuId(productKey, name, detail);
    const id = slugify(`${name}-${detail}`);

    item.dataset.menuId = menuId;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "menu-item__add";
    btn.setAttribute("aria-label", `Adaugă ${name} în coș`);
    btn.textContent = "+";
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (unavailableIds.has(menuId)) return;

      if (productKey && PRODUCT_OPTIONS[productKey]) {
        openOptionsModal(productKey, { id, name, detail, price, productKey, menuId });
      } else {
        addToCart({ id, name, detail, price, menuId });
      }
    });

    item.appendChild(btn);
  });

  applyMenuAvailability();
}

function applyMenuAvailability() {
  document.querySelectorAll(".menu-item").forEach((item) => {
    const menuId = item.dataset.menuId;
    if (!menuId) return;

    const unavailable = unavailableIds.has(menuId);
    const btn = item.querySelector(".menu-item__add");
    const name = item.querySelector(".menu-item__name")?.textContent.trim() || "Produs";

    item.classList.toggle("menu-item--unavailable", unavailable);

    if (btn) {
      btn.disabled = unavailable;
      btn.setAttribute(
        "aria-label",
        unavailable ? `${name} — indisponibil` : `Adaugă ${name} în coș`
      );
    }

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

async function submitOrder(event) {
  event.preventDefault();
  if (cart.size === 0) return;

  if (!isFirebaseConfigured()) {
    els.error.textContent = "Trimiterea comenzilor necesită configurarea Firebase.";
    els.error.hidden = false;
    return;
  }

  els.submit.disabled = true;
  els.error.hidden = true;

  const formData = new FormData(els.form);
  const customerName = formData.get("name").toString().trim();
  const tableNumber = qrTableNumber || formData.get("table").toString().trim();
  const notes = formData.get("notes").toString().trim();

  if (!customerName) {
    els.error.textContent = "Te rugăm să introduci numele.";
    els.error.hidden = false;
    els.submit.disabled = false;
    return;
  }

  const order = {
    customerName,
    tableNumber,
    notes,
    items: [...cart.values()].map((item) => ({
      id: item.id,
      name: item.name,
      detail: item.detail || "",
      price: item.linePrice != null ? item.linePrice : item.price,
      qty: item.qty,
    })),
    total: cartTotal(),
    status: "new",
    createdAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(db, "orders"), order);
    cart.clear();
    renderCart();
    els.form.reset();
    applyTableUi();
    els.success.hidden = false;
    setCartExpanded(false);
    setTimeout(() => {
      els.success.hidden = true;
      closeCheckout();
    }, 2300);
  } catch (err) {
    console.error(err);
    els.error.textContent = "Comanda nu a putut fi trimisă. Verifică conexiunea.";
    els.error.hidden = false;
  } finally {
    els.submit.disabled = !isFirebaseConfigured();
  }
}

function init() {
  initTableFromQr();
  initMenuButtons();
  subscribeMenuAvailability((ids) => {
    unavailableIds = ids;
    applyMenuAvailability();
  });
  refreshMenuAvailability()
    .then((ids) => {
      unavailableIds = ids;
      applyMenuAvailability();
    })
    .catch((err) => console.warn("refresh menu availability:", err));

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    refreshMenuAvailability()
      .then((ids) => {
        unavailableIds = ids;
        applyMenuAvailability();
      })
      .catch((err) => console.warn("refresh menu availability:", err));
  });

  renderCart();

  els.cartToggle.addEventListener("click", () => setCartExpanded(!cartExpanded));
  if (els.checkoutOpenBtn) {
    els.checkoutOpenBtn.addEventListener("click", () => openCheckout());
  }

  els.checkoutModal.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeCheckout();
  });
  els.checkoutBackdrop?.addEventListener("click", () => closeCheckout());
  document.getElementById("checkout-close")?.addEventListener("click", () => closeCheckout());

  els.optionsConfirm.addEventListener("click", confirmOptions);
  els.optionsCancel.addEventListener("click", closeOptionsModal);
  els.optionsClose.addEventListener("click", closeOptionsModal);
  els.optionsBackdrop.addEventListener("click", closeOptionsModal);

  els.optionsModal.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeOptionsModal();
  });

  els.list.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;

    if (btn.dataset.action === "edit") {
      const item = cart.get(btn.dataset.id);
      if (item) openEditModal(item);
      return;
    }

    changeQty(btn.dataset.id, btn.dataset.action === "inc" ? 1 : -1);
  });

  els.form.addEventListener("submit", submitOrder);
}

init();
