import {
  doc,
  onSnapshot,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "./firebase-app.js";

const MENU_STATE_REF = doc(db, "menu", "availability");

export function subscribeMenuAvailability(callback, onError) {
  if (!db) {
    callback(new Set());
    return () => {};
  }

  return onSnapshot(
    MENU_STATE_REF,
    (snapshot) => {
      const ids = snapshot.data()?.unavailableIds;
      callback(new Set(Array.isArray(ids) ? ids : []));
    },
    (error) => {
      console.error("menu availability subscribe error:", error);
      if (onError) onError(error);
      callback(new Set());
    }
  );
}

export async function toggleProductAvailability(menuId, currentUnavailableIds) {
  if (!db) throw new Error("Firebase nu e configurat.");

  const unavailableIds = new Set(currentUnavailableIds);
  if (unavailableIds.has(menuId)) {
    unavailableIds.delete(menuId);
  } else {
    unavailableIds.add(menuId);
  }

  await setDoc(
    MENU_STATE_REF,
    {
      unavailableIds: [...unavailableIds],
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  return unavailableIds;
}
