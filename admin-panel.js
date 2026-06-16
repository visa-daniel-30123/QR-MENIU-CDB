import {
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db, isFirebaseConfigured } from "/firebase-app.js";

const els = {
  dashboard: document.getElementById("admin-dashboard"),
  logout: document.getElementById("admin-logout"),
  login: document.getElementById("admin-login"),
  orders: document.getElementById("orders-list"),
  empty: document.getElementById("orders-empty"),
  setupError: document.getElementById("setup-error"),
  statNew: document.getElementById("stat-new"),
  statActive: document.getElementById("stat-active"),
  statDone: document.getElementById("stat-done"),
  filterBtns: document.querySelectorAll("[data-filter]"),
};

let currentFilter = "active";
let orders = [];
let knownIds = new Set();
let firstLoad = true;
let started = false;

const STATUS_LABELS = {
  new: "Nouă",
  preparing: "În lucru",
  done: "Gata",
  cancelled: "Anulată",
};

function showSetupError(message) {
  if (!els.setupError) return;
  els.setupError.textContent = message;
  els.setupError.hidden = false;
}

function formatTime(timestamp) {
  if (!timestamp?.toDate) return "—";
  const date = timestamp.toDate();
  return date.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function playNewOrderSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    /* optional */
  }
}

function updateStats() {
  const counts = { new: 0, preparing: 0, done: 0 };
  orders.forEach((order) => {
    if (counts[order.status] !== undefined) counts[order.status] += 1;
  });
  els.statNew.textContent = counts.new;
  els.statActive.textContent = counts.new + counts.preparing;
  els.statDone.textContent = counts.done;
}

function filteredOrders() {
  if (currentFilter === "active") {
    return orders.filter((o) => o.status === "new" || o.status === "preparing");
  }
  if (currentFilter === "all") return orders;
  return orders.filter((o) => o.status === currentFilter);
}

function renderOrders() {
  const list = filteredOrders();
  els.orders.innerHTML = "";
  els.empty.hidden = list.length > 0;

  list.forEach((order) => {
    const card = document.createElement("article");
    card.className = `order-card order-card--${order.status}`;
    card.dataset.id = order.id;

    const itemsHtml = order.items
      .map((item) => {
        const linePrice = item.price * item.qty;
        return `
        <li class="order-card__item">
          <span>${item.qty}× ${item.name}${item.detail ? ` <small>(${item.detail})</small>` : ""}</span>
          <span>${linePrice} lei</span>
        </li>`;
      })
      .join("");

    const actions = [];
    if (order.status === "new") {
      actions.push(
        `<button type="button" class="order-card__btn order-card__btn--primary" data-status="preparing">Preia comanda</button>`
      );
    }
    if (order.status === "preparing") {
      actions.push(
        `<button type="button" class="order-card__btn order-card__btn--success" data-status="done">Marchează gata</button>`
      );
    }
    if (order.status !== "done" && order.status !== "cancelled") {
      actions.push(
        `<button type="button" class="order-card__btn order-card__btn--ghost" data-status="cancelled">Anulează</button>`
      );
    }

    card.innerHTML = `
      <header class="order-card__header">
        <div>
          <span class="order-card__status">${STATUS_LABELS[order.status] || order.status}</span>
          <h2 class="order-card__name">${order.customerName}</h2>
          ${order.tableNumber ? `<p class="order-card__table">Masă ${order.tableNumber}</p>` : ""}
        </div>
        <time class="order-card__time">${formatTime(order.createdAt)}</time>
      </header>
      <ul class="order-card__items">${itemsHtml}</ul>
      ${order.notes ? `<p class="order-card__notes">📝 ${order.notes}</p>` : ""}
      <footer class="order-card__footer">
        <strong class="order-card__total">${order.total} lei</strong>
        <div class="order-card__actions">${actions.join("")}</div>
      </footer>
    `;

    els.orders.appendChild(card);
  });
}

async function setOrderStatus(orderId, status) {
  await updateDoc(doc(db, "orders", orderId), { status });
}

function listenOrders() {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));

  onSnapshot(
    q,
    (snapshot) => {
      orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (!firstLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" && !knownIds.has(change.doc.id)) {
            const data = change.doc.data();
            if (data.status === "new") playNewOrderSound();
          }
        });
      }

      knownIds = new Set(snapshot.docs.map((d) => d.id));
      firstLoad = false;
      updateStats();
      renderOrders();
    },
    (err) => {
      console.error(err);
      showSetupError("Nu pot încărca comenzile. Verifică regulile Firestore.");
    }
  );
}

function initFilters() {
  els.filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      els.filterBtns.forEach((b) => b.classList.remove("admin-filter--active"));
      btn.classList.add("admin-filter--active");
      currentFilter = btn.dataset.filter;
      renderOrders();
    });
  });
}

function initActions() {
  els.orders?.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-status]");
    if (!btn) return;

    const card = btn.closest(".order-card");
    const orderId = card?.dataset.id;
    const status = btn.dataset.status;
    if (!orderId || !status) return;

    btn.disabled = true;
    try {
      await setOrderStatus(orderId, status);
    } catch (err) {
      console.error(err);
      alert("Nu am putut actualiza comanda.");
      btn.disabled = false;
    }
  });
}

function initLogout(onLogout) {
  els.logout?.addEventListener("click", onLogout);
}

export function startAdminPanel(onLogout) {
  if (started) return;
  started = true;

  initFilters();
  initActions();
  initLogout(onLogout);

  if (!isFirebaseConfigured() || !db) {
    showSetupError("Firebase nu e configurat corect în config.js.");
    return;
  }

  listenOrders();
}
