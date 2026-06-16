import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db, isFirebaseConfigured } from "./firebase-app.js";

const FRIES_PRICE = 6;

const PRODUCT_OPTIONS = {
  "meniu-aripioare": { type: "sauce" },
  "meniu-crispy": { type: "sauce" },
  "meniu-cascaval": { type: "sauce" },
  mici: { type: "grill", unitPrice: 5, pieceLabel: "mici" },
  ceafa: { type: "grill", unitPrice: 20, pieceLabel: "porții" },
  carnaciori: { type: "grill", unitPrice: 5, pieceLabel: "cârnăciori" },
};

const SAUCES = ["Ketchup", "Muștar", "Maioneză", "Usturoi"];

const cart = new Map();
let pendingProduct = null;
let cartExpanded = false;

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

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
  els.error.hidden = true;
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
    row.innerHTML = `
      <div class="cart-item__info">
        <span class="cart-item__name">${escapeHtml(item.name)}</span>
        ${item.detail ? `<span class="cart-item__detail">${escapeHtml(item.detail)}</span>` : ""}
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
      "Comenzile online nu sunt activate. Completează Firebase în config.js.";
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
}

function renderSauceOptions() {
  els.optionsBody.innerHTML = `
    <p class="options-modal__hint">Alege sosul pentru meniu:</p>
    <fieldset class="options-group">
      <legend class="visually-hidden">Sos</legend>
      ${SAUCES.map(
        (sauce, i) => `
        <label class="options-choice">
          <input type="radio" name="sauce" value="${sauce}" ${i === 0 ? "checked" : ""}>
          <span>${sauce}</span>
        </label>`
      ).join("")}
    </fieldset>
  `;
  els.optionsPrice.textContent = `${pendingProduct.price} lei`;
}

function renderGrillOptions(config) {
  els.optionsBody.innerHTML = `
    <p class="options-modal__hint">Câte bucăți dorești?</p>
    <div class="options-stepper">
      <button type="button" class="options-stepper__btn" data-step="-1" aria-label="Mai puține">−</button>
      <input type="number" class="options-stepper__input" id="grill-pieces" value="1" min="1" max="30" inputmode="numeric">
      <button type="button" class="options-stepper__btn" data-step="1" aria-label="Mai multe">+</button>
      <span class="options-stepper__label">${config.pieceLabel}</span>
    </div>
    <label class="options-check">
      <input type="checkbox" id="grill-fries">
      <span>Vrei și cartofi prăjiți? <strong>+${FRIES_PRICE} lei</strong></span>
    </label>
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
  updateGrillPrice();
}

function calcGrillPrice(config) {
  const pieces = Math.min(30, Math.max(1, Number(document.getElementById("grill-pieces")?.value || 1)));
  const withFries = document.getElementById("grill-fries")?.checked;
  return pieces * config.unitPrice + (withFries ? FRIES_PRICE : 0);
}

function openOptionsModal(productKey, baseProduct) {
  const config = PRODUCT_OPTIONS[productKey];
  if (!config) return;

  pendingProduct = { ...baseProduct, productKey };
  els.optionsTitle.textContent = baseProduct.name;
  els.optionsError.hidden = true;

  if (config.type === "sauce") {
    renderSauceOptions();
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
    const sauce = els.optionsBody.querySelector('input[name="sauce"]:checked');
    if (!sauce) {
      els.optionsError.textContent = "Alege un sos.";
      els.optionsError.hidden = false;
      return;
    }

    const detail = `Sos: ${sauce.value}`;
    const id = slugify(`${pendingProduct.name}-${detail}`);

    addToCart({
      id,
      name: pendingProduct.name,
      detail,
      price: pendingProduct.price,
      linePrice: pendingProduct.price,
      customizable: true,
    });
  } else {
    const pieces = Math.min(30, Math.max(1, Number(document.getElementById("grill-pieces").value)));
    const withFries = document.getElementById("grill-fries").checked;
    const linePrice = pieces * config.unitPrice + (withFries ? FRIES_PRICE : 0);

    const detailParts = [`${pieces} buc.`];
    if (withFries) detailParts.push("+ cartofi prăjiți");

    const detail = detailParts.join(" · ");
    const id = slugify(`${pendingProduct.name}-${pieces}-${withFries ? "fries" : "nofries"}`);

    addToCart({
      id,
      name: pendingProduct.name,
      detail,
      price: config.unitPrice,
      linePrice,
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
    const id = slugify(`${name}-${detail}`);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "menu-item__add";
    btn.setAttribute("aria-label", `Adaugă ${name} în coș`);
    btn.textContent = "+";
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (productKey && PRODUCT_OPTIONS[productKey]) {
        openOptionsModal(productKey, { id, name, detail, price, productKey });
      } else {
        addToCart({ id, name, detail, price });
      }
    });

    item.appendChild(btn);
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
  const tableNumber = formData.get("table").toString().trim();
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
  initMenuButtons();
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
    changeQty(btn.dataset.id, btn.dataset.action === "inc" ? 1 : -1);
  });

  els.form.addEventListener("submit", submitOrder);
}

init();
