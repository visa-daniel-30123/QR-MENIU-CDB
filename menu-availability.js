import {
  doc,
  onSnapshot,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "./firebase-app.js";

const SETTINGS_REF = doc(db, "settings", "menu");

export function subscribeMenuAvailability(callback) {
  if (!db) {
    callback(new Set());
    return () => {};
  }

  return onSnapshot(
    SETTINGS_REF,
    (snapshot) => {
      const ids = snapshot.data()?.unavailableIds;
      callback(new Set(Array.isArray(ids) ? ids : []));
    },
    () => callback(new Set())
  );
}

export async function toggleProductAvailability(menuId) {
  if (!db) throw new Error("Firebase nu e configurat.");

  const snapshot = await getDoc(SETTINGS_REF);
  const current = snapshot.data()?.unavailableIds;
  const unavailableIds = new Set(Array.isArray(current) ? current : []);

  if (unavailableIds.has(menuId)) {
    unavailableIds.delete(menuId);
  } else {
    unavailableIds.add(menuId);
  }

  await setDoc(
    SETTINGS_REF,
    { unavailableIds: [...unavailableIds] },
    { merge: true }
  );
}
