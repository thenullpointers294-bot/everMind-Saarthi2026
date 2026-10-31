// Firebase is initialised ONLY from environment variables (never hardcoded).
// Supports two backends:
//   - Realtime Database  (VITE_FIREBASE_DATABASE_URL set)   <- used by the Ever-Mind pendant
//   - Firestore          (VITE_FIREBASE_PROJECT_ID + API key, no DATABASE_URL)
// If nothing is configured the app falls back to localStorage demo mode.
//
// SECURITY: never put a legacy "database secret" or service-account key here.
// Only the public Web SDK config belongs in a browser app; access is governed
// by database security rules.
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getDatabase, type Database } from "firebase/database";
import { getAuth, type Auth } from "firebase/auth";

const env = import.meta.env;

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
};

export type Backend = "rtdb" | "firestore" | "demo";

export const backend: Backend = config.databaseURL
  ? "rtdb"
  : config.apiKey && config.projectId && config.appId
    ? "firestore"
    : "demo";

export const firebaseEnabled = backend !== "demo";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let rtdb: Database | null = null;
let auth: Auth | null = null;

if (firebaseEnabled) {
  // Strip undefined values so the SDK doesn't complain
  const clean = Object.fromEntries(
    Object.entries(config).filter(([, v]) => Boolean(v))
  );
  app = initializeApp(clean);
  if (backend === "rtdb") rtdb = getDatabase(app, config.databaseURL);
  else db = getFirestore(app);
  // Email/password auth needs an API key; without it we rely on the PIN gate
  if (config.apiKey) auth = getAuth(app);
}

export { app, db, rtdb, auth };
export const authAvailable = auth !== null;
export const DEFAULT_DEVICE_ID =
  (env.VITE_DEFAULT_DEVICE_ID as string) || "mg-demo-01";
