// =====================================================================
// authService — accounts, sessions and patient<->caregiver pairing.
//   • Firebase Auth (email/password) when an API key is configured
//   • Otherwise a database-backed account store (salted SHA-256 hashes)
//     in RTDB / Firestore, or localStorage in demo mode.
// Profiles live at users/{uid}; pairing codes at pairings/{code}.
// =====================================================================
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
} from "firebase/auth";
import { ref, get, set, update, onValue } from "firebase/database";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { auth, rtdb, db, backend } from "./firebase";
import { readKey, writeKey, subscribeKey } from "./localStore";
import { saveSettings } from "./dataService";

export type AccountRole = "patient" | "caregiver";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: AccountRole;
  pairCode?: string; // patients: their unique code
  linkedCode?: string; // caregivers: the patient code they joined
  createdAt: number;
}

export interface Pairing {
  code: string;
  patientUid: string;
  patientName: string;
  deviceId: string;
  caregivers?: Record<string, { name: string; email: string; joinedAt: number }>;
}

interface StoredAccount {
  uid: string;
  email: string;
  salt: string;
  hash: string;
}

import { sha256 as jsSha256 } from "js-sha256";

// ---------------- crypto helpers (Universal for HTTPS, Localhost, & Mobile LAN HTTP) ----------------
function getRandomBytes(len: number): Uint8Array {
  const bytes = new Uint8Array(len);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < len; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

async function sha256(text: string): Promise<string> {
  // Use native Web Crypto if available in Secure Contexts (HTTPS/localhost)
  if (typeof crypto !== "undefined" && crypto.subtle && typeof crypto.subtle.digest === "function") {
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      // Fallback to pure JS below
    }
  }
  // Pure JavaScript SHA-256 fallback for Mobile HTTP (IP addresses)
  return jsSha256(text);
}

const randomId = (len = 16) =>
  Array.from(getRandomBytes(len))
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, len);

export function generatePairCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  const bytes = getRandomBytes(6);
  return "MG-" + Array.from(bytes).map((b) => alphabet[b % alphabet.length]).join("");
}

// ---------------- generic key/value storage ----------------
async function dbGet<T>(path: string): Promise<T | null> {
  if (backend === "rtdb" && rtdb) return ((await get(ref(rtdb, path))).val() as T) ?? null;
  if (backend === "firestore" && db) {
    const [col, id] = path.split("/");
    const s = await getDoc(doc(db, col, id));
    return s.exists() ? (s.data() as T) : null;
  }
  const [col, id] = path.split("/");
  return readKey<Record<string, T>>(col, {})[id] ?? null;
}
async function dbSet<T extends object>(path: string, value: T) {
  const v = JSON.parse(JSON.stringify(value));
  if (backend === "rtdb" && rtdb) return set(ref(rtdb, path), v);
  if (backend === "firestore" && db) {
    const [col, id] = path.split("/");
    return setDoc(doc(db, col, id), v);
  }
  const [col, id] = path.split("/");
  const all = readKey<Record<string, T>>(col, {});
  all[id] = v;
  writeKey(col, all);
}
async function dbUpdate(path: string, patch: Record<string, unknown>) {
  const v = JSON.parse(JSON.stringify(patch));
  if (backend === "rtdb" && rtdb) return update(ref(rtdb, path), v);
  if (backend === "firestore" && db) {
    const [col, id] = path.split("/");
    return updateDoc(doc(db, col, id), v);
  }
  const [col, id] = path.split("/");
  const all = readKey<Record<string, object>>(col, {});
  all[id] = { ...(all[id] ?? {}), ...v };
  writeKey(col, all);
}

// ---------------- session ----------------
const SESSION_KEY = "session";
export function getSession(): UserProfile | null {
  return readKey<UserProfile | null>(SESSION_KEY, null);
}
export function subscribeSession(cb: (p: UserProfile | null) => void): () => void {
  cb(getSession());
  const unsubLocal = subscribeKey(SESSION_KEY, () => cb(getSession()));

  let unsubRemote = () => {};
  const current = getSession();
  if (current?.uid && backend === "rtdb" && rtdb) {
    unsubRemote = onValue(ref(rtdb, `users/${current.uid}`), (snap) => {
      const val = snap.val() as UserProfile | null;
      if (val) {
        const local = getSession();
        const merged: UserProfile = { ...(local ?? {}), ...val };
        if (JSON.stringify(merged) !== JSON.stringify(local)) {
          writeKey(SESSION_KEY, merged);
          applyProfileToSettings(merged);
          cb(merged);
        }
      }
    });
  }

  return () => {
    unsubLocal();
    unsubRemote();
  };
}
function setSession(p: UserProfile | null) {
  writeKey(SESSION_KEY, p);
  if (p) applyProfileToSettings(p);
}

async function applyProfileToSettings(p: UserProfile) {
  if (p.role === "patient") {
    const pairing = p.pairCode ? await dbGet<Pairing>(`pairings/${p.pairCode}`) : null;
    saveSettings({
      role: "wearer",
      wearerName: p.name,
      deviceId: pairing?.deviceId || "mg-demo-01",
    });
  } else {
    const pairing = p.linkedCode ? await dbGet<Pairing>(`pairings/${p.linkedCode}`) : null;
    saveSettings({
      role: "caregiver",
      wearerName: pairing?.patientName || "Wearer",
      deviceId: pairing?.deviceId || "mg-demo-01",
    });
  }
}

const emailKey = (email: string) => sha256(email.trim().toLowerCase());

// ---------------- sign up / sign in ----------------
export async function signUp(input: {
  email: string;
  password: string;
  name: string;
  role: AccountRole;
}): Promise<UserProfile> {
  const email = input.email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Please enter a valid email address.");
  if (input.password.length < 6) throw new Error("Password must be at least 6 characters.");
  if (!input.name.trim()) throw new Error("Please enter a name.");

  let uid: string;
  if (auth) {
    const cred = await createUserWithEmailAndPassword(auth, email, input.password);
    uid = cred.user.uid;
  } else {
    uid = await emailKey(email);
    if (await dbGet<StoredAccount>(`accounts/${uid}`))
      throw new Error("An account with this email already exists. Please sign in.");
    const salt = randomId(16);
    await dbSet<StoredAccount>(`accounts/${uid}`, {
      uid,
      email,
      salt,
      hash: await sha256(salt + input.password),
    });
  }

  const profile: UserProfile = {
    uid,
    email,
    name: input.name.trim(),
    role: input.role,
    createdAt: Date.now(),
  };

  if (input.role === "patient") {
    // Generate a unique pairing code for this patient
    let code = generatePairCode();
    while (await dbGet(`pairings/${code}`)) code = generatePairCode();
    profile.pairCode = code;
    await dbSet<Pairing>(`pairings/${code}`, {
      code,
      patientUid: uid,
      patientName: profile.name,
      deviceId: "mg-demo-01",
    });
  }

  await dbSet(`users/${uid}`, profile);
  setSession(profile);
  return profile;
}

export async function signIn(input: {
  email: string;
  password: string;
  role: AccountRole;
}): Promise<UserProfile> {
  const email = input.email.trim().toLowerCase();
  let uid: string;
  if (auth) {
    const cred = await signInWithEmailAndPassword(auth, email, input.password);
    uid = cred.user.uid;
  } else {
    uid = await emailKey(email);
    const acc = await dbGet<StoredAccount>(`accounts/${uid}`);
    if (!acc || acc.hash !== (await sha256(acc.salt + input.password)))
      throw new Error("Incorrect email or password.");
  }
  const profile = await dbGet<UserProfile>(`users/${uid}`);
  if (!profile) throw new Error("Profile not found. Please sign up first.");
  if (profile.role !== input.role)
    throw new Error(
      `This account is registered as a ${profile.role === "patient" ? "Patient" : "Caretaker"}. Please select that role.`
    );
  setSession(profile);
  return profile;
}

export async function signOut() {
  if (auth) await fbSignOut(auth).catch(() => {});
  setSession(null);
  saveSettings({ role: null });
}

// ---------------- pairing ----------------
export async function lookupPairing(code: string): Promise<Pairing | null> {
  return dbGet<Pairing>(`pairings/${normaliseCode(code)}`);
}

export function normaliseCode(code: string): string {
  const c = code.trim().toUpperCase().replace(/[\s-]/g, "");
  const raw = c.replace(/^(MG|EM)/, "");
  return "MG-" + raw;
}

/** Caregiver joins a patient by entering their code. */
export async function linkToPatient(code: string): Promise<Pairing> {
  const me = getSession();
  if (!me || me.role !== "caregiver") throw new Error("Only caretakers can link to a patient.");
  const norm = normaliseCode(code);
  const pairing = await dbGet<Pairing>(`pairings/${norm}`);
  if (!pairing) throw new Error("No patient found with that code. Please check and try again.");
  await dbUpdate(`pairings/${norm}`, {
    [`caregivers/${me.uid}`]: { name: me.name, email: me.email, joinedAt: Date.now() },
  });
  await dbUpdate(`users/${me.uid}`, { linkedCode: norm });
  setSession({ ...me, linkedCode: norm });
  return pairing;
}

export async function unlinkPatient() {
  const me = getSession();
  if (!me) return;
  await dbUpdate(`users/${me.uid}`, { linkedCode: null });
  setSession({ ...me, linkedCode: undefined });
}

/** Live-follow a pairing record (pendant id / patient name changes). */
export function subscribePairing(code: string, cb: (p: Pairing | null) => void): () => void {
  if (backend === "rtdb" && rtdb) {
    return onValue(ref(rtdb, `pairings/${code}`), (s) => cb((s.val() as Pairing) ?? null));
  }
  if (backend === "firestore" && db) {
    return onSnapshot(doc(db, "pairings", code), (s) =>
      cb(s.exists() ? (s.data() as Pairing) : null)
    );
  }
  const read = () => cb(readKey<Record<string, Pairing>>("pairings", {})[code] ?? null);
  read();
  return subscribeKey("pairings", read);
}

/** Patient (or caregiver) updates the pendant id attached to a pairing. */
export async function setPairingDevice(code: string, deviceId: string) {
  await dbUpdate(`pairings/${code}`, { deviceId });
  saveSettings({ deviceId });
}
