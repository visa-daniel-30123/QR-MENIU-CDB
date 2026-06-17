import {
  doc,
  onSnapshot,
  setDoc,
  getDocFromServer,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "./firebase-app.js";
import {
  normalizeUnavailableIds,
  resolveCanonicalMenuId,
  getProductIdVariants,
} from "./menu-catalog.js";

const MENU_STATE_REF = doc(db, "menu", "availability");
const LEGACY_STATE_REF = doc(db, "settings", "menu");

function idsFromSnapshot(snapshot) {
  if (!snapshot.exists()) return new Set();

  const ids = snapshot.data()?.unavailableIds;
  const raw = Array.isArray(ids)
    ? ids.filter((id) => typeof id === "string" && id.trim())
    : [];
  return normalizeUnavailableIds(raw);
}

function updatedAtFromSnapshot(snapshot) {
  if (!snapshot.exists()) return 0;
  const value = snapshot.data()?.updatedAt;
  return typeof value === "number" ? value : 0;
}

async function readAvailabilityFromServer() {
  try {
    const snapshot = await getDocFromServer(MENU_STATE_REF);
    return {
      ids: idsFromSnapshot(snapshot),
      updatedAt: updatedAtFromSnapshot(snapshot),
    };
  } catch (err) {
    console.warn("read menu/availability from server:", err);
    return { ids: new Set(), updatedAt: 0 };
  }
}

export function subscribeMenuAvailability(callback, onError) {
  if (!db) {
    callback(new Set(), 0);
    return () => {};
  }

  return onSnapshot(
    MENU_STATE_REF,
    (snapshot) => {
      callback(idsFromSnapshot(snapshot), updatedAtFromSnapshot(snapshot));
    },
    (error) => {
      console.error("menu availability subscribe error:", error);
      if (onError) onError(error);
    }
  );
}

export async function refreshMenuAvailability() {
  if (!db) return new Set();
  const state = await readAvailabilityFromServer();
  return state.ids;
}

async function writeAvailabilityState(unavailableIds, updatedAt = Date.now()) {
  const payload = {
    unavailableIds: [...unavailableIds],
    updatedAt,
  };

  const errors = [];

  try {
    await setDoc(MENU_STATE_REF, payload);
  } catch (err) {
    errors.push(err);
  }

  try {
    await setDoc(LEGACY_STATE_REF, payload);
  } catch (err) {
    errors.push(err);
  }

  if (errors.length === 2) {
    throw errors[0];
  }

  return updatedAt;
}

export async function toggleProductAvailability(menuId, currentUnavailableIds) {
  if (!db) throw new Error("Firebase nu e configurat.");

  const unavailableIds = normalizeUnavailableIds(currentUnavailableIds);
  const canonical = resolveCanonicalMenuId(menuId);
  const isUnavailable = unavailableIds.has(canonical);

  getProductIdVariants(canonical).forEach((variant) => unavailableIds.delete(variant));
  unavailableIds.delete(canonical);

  if (!isUnavailable) {
    unavailableIds.add(canonical);
  }

  const updatedAt = await writeAvailabilityState(unavailableIds);
  return { ids: unavailableIds, updatedAt };
}
