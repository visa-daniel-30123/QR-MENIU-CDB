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

async function readAvailabilityFromServer() {
  try {
    const snapshot = await getDocFromServer(MENU_STATE_REF);
    return idsFromSnapshot(snapshot);
  } catch (err) {
    console.warn("read menu/availability from server:", err);
    return new Set();
  }
}

export function subscribeMenuAvailability(callback, onError) {
  if (!db) {
    callback(new Set());
    return () => {};
  }

  return onSnapshot(
    MENU_STATE_REF,
    { includeMetadataChanges: true },
    (snapshot) => {
      if (snapshot.metadata.fromCache) return;
      callback(idsFromSnapshot(snapshot));
    },
    (error) => {
      console.error("menu availability subscribe error:", error);
      if (onError) onError(error);
    }
  );
}

export async function refreshMenuAvailability() {
  if (!db) return new Set();
  return readAvailabilityFromServer();
}

async function writeAvailabilityState(unavailableIds) {
  const payload = {
    unavailableIds: [...unavailableIds],
    updatedAt: Date.now(),
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
}

export async function repairMenuAvailability() {
  if (!db) return new Set();

  const canonical = await readAvailabilityFromServer();
  await writeAvailabilityState(canonical);
  return canonical;
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

  await writeAvailabilityState(unavailableIds);
  return unavailableIds;
}
