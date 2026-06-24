import {
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db, isFirebaseConfigured } from "./firebase-app.js";

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
let audioContext = null;
let swRegistration = null;
let titleFlashTimer = null;
const PAGE_TITLE = "Admin comenzi — Casuta dintre brazi";

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

function unlockAudio() {
  try {
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === "suspended") audioContext.resume();
  } catch {
    /* optional */
  }
}

function playNewOrderSound() {
  try {
    unlockAudio();
    const ctx = audioContext || new AudioContext();
    audioContext = ctx;

    [0, 0.25, 0.5].forEach((delay, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = index % 2 === 0 ? 880 : 1100;
      gain.gain.value = 0.2;
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.22);
    });
  } catch {
    /* optional */
  }
}

function vibrateNewOrder() {
  if (!("vibrate" in navigator)) return;
  try {
    navigator.vibrate([180, 90, 180, 90, 320]);
  } catch {
    /* optional */
  }
}

function buildOrderNotificationContent(order) {
  const table = order.tableNumber ? ` · Masa ${order.tableNumber}` : "";
  const itemCount = Array.isArray(order.items) ? order.items.length : 0;
  return {
    title: "Comandă nouă — Casuta dintre brazi",
    body: `${order.customerName || "Client"}${table} · ${order.total} lei · ${itemCount} produse`,
    table,
  };
}

function buildNotificationOptions(order) {
  return {
    body: buildOrderNotificationContent(order).body,
    icon: "LOGO CDB.jpg",
    badge: "LOGO CDB.jpg",
    tag: `order-${order.id}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [180, 90, 180, 90, 320],
    data: { url: "./admin.html" },
  };
}

async function ensureServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    swRegistration = await navigator.serviceWorker.register("./admin-sw.js");
    await navigator.serviceWorker.ready;
    return swRegistration;
  } catch (err) {
    console.warn("admin service worker:", err);
    return null;
  }
}

async function showSystemNotification(order) {
  const { title } = buildOrderNotificationContent(order);
  const options = buildNotificationOptions(order);

  if (swRegistration?.showNotification) {
    try {
      await swRegistration.showNotification(title, options);
      return true;
    } catch (err) {
      console.warn("SW notification:", err);
    }
  }

  const worker = navigator.serviceWorker?.controller;
  if (worker) {
    worker.postMessage({ type: "SHOW_ORDER_NOTIFICATION", title, options });
    return true;
  }

  if (notificationsEnabled()) {
    try {
      const notification = new Notification(title, options);
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      return true;
    } catch (err) {
      console.warn("Notification API:", err);
    }
  }

  return false;
}

function startTitleFlash() {
  if (titleFlashTimer || !document.hidden) return;
  let on = true;
  titleFlashTimer = window.setInterval(() => {
    document.title = on ? "🔔 COMANDĂ NOUĂ!" : PAGE_TITLE;
    on = !on;
  }, 900);
}

function stopTitleFlash() {
  if (!titleFlashTimer) return;
  window.clearInterval(titleFlashTimer);
  titleFlashTimer = null;
  if (document.title.startsWith("🔔")) document.title = PAGE_TITLE;
}

function showPersistentOrderAlert(order) {
  const alert = document.getElementById("admin-order-alert");
  const text = document.getElementById("admin-order-alert-text");
  if (!alert || !text) return;

  const { body } = buildOrderNotificationContent(order);
  text.textContent = body;
  alert.hidden = false;
}

function hidePersistentOrderAlert() {
  const alert = document.getElementById("admin-order-alert");
  if (alert) alert.hidden = true;
  stopTitleFlash();
}

function canUseNotifications() {
  return "Notification" in window;
}

function notificationsEnabled() {
  return canUseNotifications() && Notification.permission === "granted";
}

async function requestNotifications() {
  if (!canUseNotifications()) return false;
  await ensureServiceWorker();
  const permission = await Notification.requestPermission();
  updateNotificationUi();
  return permission === "granted";
}

async function notifyNewOrder(order) {
  showNewOrderToast(order);
  showPersistentOrderAlert(order);
  vibrateNewOrder();
  if (document.hidden) startTitleFlash();
  await showSystemNotification(order);
}

function showNewOrderToast(order) {
  const toast = document.getElementById("admin-toast");
  if (!toast) return;

  const { body } = buildOrderNotificationContent(order);
  toast.textContent = `Comandă nouă: ${body}`;
  toast.hidden = false;
  toast.classList.add("admin-toast--show");
  document.title = `🔔 Comandă nouă! — ${PAGE_TITLE}`;

  window.setTimeout(() => {
    toast.classList.remove("admin-toast--show");
    window.setTimeout(() => {
      toast.hidden = true;
      if (!document.hidden && !titleFlashTimer) document.title = PAGE_TITLE;
    }, 300);
  }, 12000);
}

function updateNotificationUi() {
  const banner = document.getElementById("admin-notify");
  const active = document.getElementById("admin-notify-active");
  const button = document.getElementById("admin-notify-btn");
  const text = document.getElementById("admin-notify-text");
  if (!banner || !button) return;

  if (!canUseNotifications()) {
    banner.hidden = false;
    if (text) {
      text.textContent =
        "Browserul nu suportă notificări. Vei vedea banner roșu + sunet când vine o comandă (ține admin-ul deschis).";
    }
    button.hidden = true;
    if (active) active.hidden = true;
    return;
  }

  if (Notification.permission === "granted") {
    banner.hidden = true;
    if (active) active.hidden = false;
    return;
  }

  if (active) active.hidden = true;
  banner.hidden = false;
  button.hidden = false;
  button.textContent =
    Notification.permission === "denied"
      ? "Notificări blocate — deschide setările browserului"
      : "Activează notificări";
  button.disabled = false;
  if (Notification.permission === "denied" && text) {
    text.textContent =
      "Notificările sunt blocate. Permite notificări pentru acest site din setările browserului.";
  }
}

export async function setupNotificationsOnLogin() {
  unlockAudio();
  await ensureServiceWorker();
  if (!canUseNotifications()) {
    updateNotificationUi();
    return;
  }
  if (Notification.permission === "default") {
    await requestNotifications();
  }
  updateNotificationUi();
}

function initNotifications() {
  const button = document.getElementById("admin-notify-btn");
  const dismissAlert = document.getElementById("admin-order-alert-dismiss");

  button?.addEventListener("click", () => {
    requestNotifications();
  });
  dismissAlert?.addEventListener("click", hidePersistentOrderAlert);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) stopTitleFlash();
  });

  updateNotificationUi();
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
            if (data.status === "new") {
              playNewOrderSound();
              notifyNewOrder({ id: change.doc.id, ...data });
            }
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

function initAdminViews() {
  const tabs = document.querySelectorAll("[data-admin-view]");
  const ordersView = document.getElementById("admin-view-orders");
  const productsView = document.getElementById("admin-view-products");
  if (!tabs.length || !ordersView || !productsView) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const view = tab.dataset.adminView;
      tabs.forEach((item) => item.classList.toggle("admin-tab--active", item === tab));
      ordersView.classList.toggle("admin-view--hidden", view !== "orders");
      productsView.classList.toggle("admin-view--hidden", view !== "products");
    });
  });
}

export function startAdminPanel(onLogout) {
  if (started) return;
  started = true;

  initAdminViews();
  initFilters();
  initActions();
  initLogout(onLogout);
  initNotifications();

  if (!isFirebaseConfigured() || !db) {
    showSetupError("Firebase nu e configurat corect în config.js.");
    return;
  }

  ensureServiceWorker().finally(() => {
    listenOrders();
  });
}
