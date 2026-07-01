import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getDatabase, type Database } from "firebase/database";

// Public web config. These keys are safe on the client (Firebase security is
// enforced via Firestore/RTDB security rules, not by hiding the API key).
// Prefer env vars; fall back to hardcoded placeholder so the app still builds.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "",
};

export const isFirebaseConfigured = !!(config.apiKey && config.projectId);

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _rtdb: Database | null = null;

export function getFirebase() {
  if (typeof window === "undefined") return { app: null, db: null, rtdb: null };
  if (!isFirebaseConfigured) return { app: null, db: null, rtdb: null };
  if (!_app) {
    _app = getApps()[0] || initializeApp(config);
    _db = getFirestore(_app);
    try { _rtdb = getDatabase(_app); } catch { _rtdb = null; }
  }
  return { app: _app, db: _db, rtdb: _rtdb };
}
