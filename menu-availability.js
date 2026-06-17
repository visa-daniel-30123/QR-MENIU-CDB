import {
  doc,
  onSnapshot,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "./firebase-app.js";

const MENU_STATE_REF = doc(db, "menu", "availability");
const LEGACY_STATE_REF = doc(db, "settings", "menu");

function idsFromSnapshot(snapshot) {
  const ids = snapshot.data()?.unavailableIds;
  return new Set(Array.isArray(ids) ? ids : []);
}

function mergeIdSets(...sets) {
  const merged = new Set();
  sets.forEach((set) => set.forEach((id) => merged.add(id)));
  return merged;
}

export function subscribeMenuAvailability(callback, onError) {
  if (!db) {
    callback(new Set());
    return () => {};
  }

  const latest = {
    primary: new Set(),
    legacy: new Set(),
  };

  const emit = () => {
    callback(mergeIdSets(latest.primary, latest.legacy));
  };

  const handleError = (error) => {
    console.error("menu availability subscribe error:", error);
    if (onError) onError(error);
  };

  const unsubPrimary = onSnapshot(
    MENU_STATE_REF,
    (snapshot) => {
      latest.primary = idsFromSnapshot(snapshot);
      emit();
    },
    handleError
  );

  const unsubLegacy = onSnapshot(
    LEGACY_STATE_REF,
    (snapshot) => {
      latest.legacy = idsFromSnapshot(snapshot);
      emit();
    },
    (error) => {
      console.warn("legacy menu availability subscribe error:", error);
    }
  );

  return () => {
    unsubPrimary();
    unsubLegacy();
  };
}

export async function refreshMenuAvailability() {
  if (!db) return new Set();

  const [primarySnap, legacySnap] = await Promise.all([
    getDoc(MENU_STATE_REF),
    getDoc(LEGACY_STATE_REF),
  ]);

  return mergeIdSets(idsFromSnapshot(primarySnap), idsFromSnapshot(legacySnap));
}

export async function toggleProductAvailability(menuId, currentUnavailableIds) {
  if (!db) throw new Error("Firebase nu e configurat.");

  const unavailableIds = new Set(currentUnavailableIds);
  if (unavailableIds.has(menuId)) {
    unavailableIds.delete(menuId);
  } else {
    unavailableIds.add(menuId);
  }

  const payload = {
    unavailableIds: [...unavailableIds],
    updatedAt: Date.now(),
  };

  const errors = [];

  try {
    await setDoc(MENU_STATE_REF, payload, { merge: true });
  } catch (err) {
    errors.push(err);
  }

  try {
    await setDoc(LEGACY_STATE_REF, payload, { merge: true });
  } catch (err) {
    errors.push(err);
  }

  if (errors.length === 2) {
    throw errors[0];
  }

  return unavailableIds;
}
