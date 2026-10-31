// =====================================================================
// dataService — ALL data access goes through this layer.
//   backend "rtdb"      -> Firebase Realtime Database (Ever-Mind pendant)
//   backend "firestore" -> Cloud Firestore
//   backend "demo"      -> localStorage demo data ("Demo data" badge)
// =====================================================================
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  ref,
  onValue,
  query as rtQuery,
  orderByChild,
  limitToLast,
  push,
  set,
  remove,
  serverTimestamp as rtServerTimestamp,
} from "firebase/database";
import {
  db,
  rtdb,
  backend,
  authAvailable,
  DEFAULT_DEVICE_ID,
} from "./firebase";
import {
  ensureSeeded,
  readKey,
  writeKey,
  subscribeKey,
  defaultSettings,
} from "./localStore";
import type {
  AlertState,
  AppSettings,
  Contact,
  DeviceEvent,
  DeviceEventType,
  Reminder,
} from "../types";

export const isDemo = backend === "demo";
export { DEFAULT_DEVICE_ID, backend, authAvailable };

if (isDemo) ensureSeeded();

// Strip undefined values (Firebase rejects them)
const clean = <T>(v: T): T => JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------
// Patient scope — reminders / contacts / alert states are stored per
// patient pairing code: patients/{code}/reminders etc.
// ---------------------------------------------------------------
let scope = "shared";
const scopeListeners = new Set<() => void>();
export function setScope(code: string | null | undefined) {
  const next = code || "shared";
  if (next === scope) return;
  scope = next;
  scopeListeners.forEach((fn) => fn());
}
export function getScope() {
  return scope;
}
export function onScopeChange(fn: () => void): () => void {
  scopeListeners.add(fn);
  return () => scopeListeners.delete(fn);
}
const scoped = (path: string) => `patients/${scope}/${path}`;

// ---------------------------------------------------------------
// Settings (always local — device-specific preferences like role/PIN)
// ---------------------------------------------------------------
export function getSettings(): AppSettings {
  const s = { ...defaultSettings, ...readKey<Partial<AppSettings>>("settings", {}) };
  if (!readKey<Partial<AppSettings>>("settings", {}).deviceId) s.deviceId = DEFAULT_DEVICE_ID;
  return s;
}
export function saveSettings(patch: Partial<AppSettings>) {
  writeKey("settings", { ...getSettings(), ...patch });
}
export function subscribeSettings(cb: (s: AppSettings) => void): () => void {
  cb(getSettings());
  return subscribeKey("settings", () => cb(getSettings()));
}

// ---------------------------------------------------------------
// Event normalisation — tolerant of what real firmware actually sends
// ---------------------------------------------------------------
function toMs(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v; // seconds -> ms
  if (typeof v === "string") {
    const n = Number(v);
    if (!Number.isNaN(n)) return toMs(n);
    const d = Date.parse(v);
    if (!Number.isNaN(d)) return d;
  }
  if (v && typeof v === "object" && "seconds" in (v as object))
    return (v as { seconds: number }).seconds * 1000;
  return Date.now();
}

const VALID_TYPES: DeviceEventType[] = ["sos", "possible_fall", "ok", "home", "location"];

function normaliseEvent(id: string, raw: Record<string, unknown>, deviceId: string): DeviceEvent {
  const type = String(raw.type ?? "location").toLowerCase() as DeviceEventType;
  const lat = raw.lat ?? raw.latitude ?? null;
  const lon = raw.lon ?? raw.lng ?? raw.longitude ?? null;
  const latN = lat == null ? null : Number(lat);
  const lonN = lon == null ? null : Number(lon);
  const hasFix =
    raw.hasFix != null
      ? Boolean(raw.hasFix)
      : latN != null && lonN != null && !(latN === 0 && lonN === 0);
  return {
    id,
    type: VALID_TYPES.includes(type) ? type : "location",
    deviceId: String(raw.deviceId ?? deviceId),
    hasFix,
    lat: Number.isFinite(latN as number) ? latN : null,
    lon: Number.isFinite(lonN as number) ? lonN : null,
    fixAgeMs: raw.fixAgeMs != null ? Number(raw.fixAgeMs) : undefined,
    experimental: raw.experimental != null ? Boolean(raw.experimental) : undefined,
    createdAt: toMs(raw.createdAt ?? raw.timestamp ?? raw.ts),
    uptimeMs: Number(raw.uptimeMs ?? 0),
  };
}

// ---------------------------------------------------------------
// Device events: devices/{deviceId}/events  (READ-ONLY for caregivers;
// only the pendant/simulator appends)
// ---------------------------------------------------------------
export function subscribeEvents(
  deviceId: string,
  cb: (events: DeviceEvent[]) => void
): () => void {
  if (backend === "rtdb" && rtdb) {
    const q = rtQuery(
      ref(rtdb, `devices/${deviceId}/events`),
      orderByChild("createdAt"),
      limitToLast(50)
    );
    return onValue(
      q,
      (snap) => {
        const out: DeviceEvent[] = [];
        snap.forEach((child) => {
          const v = child.val();
          if (v && typeof v === "object") out.push(normaliseEvent(child.key!, v, deviceId));
        });
        cb(out.sort((a, b) => b.createdAt - a.createdAt));
      },
      (err) => console.error("RTDB events listener error:", err)
    );
  }
  if (backend === "firestore" && db) {
    const q = query(
      collection(db, "devices", deviceId, "events"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    return onSnapshot(q, (snap) =>
      cb(snap.docs.map((d) => normaliseEvent(d.id, d.data(), deviceId)))
    );
  }
  const read = () =>
    cb(
      readKey<DeviceEvent[]>("events", [])
        .filter((e) => e.deviceId === deviceId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 50)
    );
  read();
  return subscribeKey("events", read);
}

/** Used by the Pendant Simulator — writes the exact same event format the ESP32 uses. */
export async function addDeviceEvent(
  deviceId: string,
  event: Omit<DeviceEvent, "id" | "createdAt"> & { createdAt?: number }
) {
  if (backend === "rtdb" && rtdb) {
    await set(push(ref(rtdb, `devices/${deviceId}/events`)), {
      ...clean(event),
      createdAt: rtServerTimestamp(),
    });
    return;
  }
  if (backend === "firestore" && db) {
    await addDoc(collection(db, "devices", deviceId, "events"), {
      ...clean(event),
      createdAt: serverTimestamp(),
    });
    return;
  }
  const events = readKey<DeviceEvent[]>("events", []);
  events.push({
    ...event,
    id: "ev-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    createdAt: event.createdAt ?? Date.now(),
  });
  writeKey("events", events.slice(-200));
}

// ---------------------------------------------------------------
// Generic keyed-collection helpers (alerts, reminders, contacts)
// ---------------------------------------------------------------
function subscribeMap<T extends object>(
  path: string,
  cb: (items: Record<string, T>) => void,
  localKey: string,
  localRead: () => Record<string, T>
): () => void {
  if (backend === "rtdb" && rtdb) {
    return onValue(
      ref(rtdb, scoped(path)),
      (snap) => cb((snap.val() as Record<string, T>) ?? {}),
      (err) => console.error(`RTDB ${path} listener error:`, err)
    );
  }
  if (backend === "firestore" && db) {
    return onSnapshot(collection(db, scoped(path)), (snap) => {
      const out: Record<string, T> = {};
      snap.docs.forEach((d) => (out[d.id] = d.data() as T));
      cb(out);
    });
  }
  const read = () => cb(localRead());
  read();
  return subscribeKey(localKey, read);
}

async function setItem<T extends object>(path: string, id: string, value: T) {
  if (backend === "rtdb" && rtdb) return set(ref(rtdb, `${scoped(path)}/${id}`), clean(value));
  if (backend === "firestore" && db)
    return setDoc(doc(db, scoped(path), id), clean(value), { merge: true });
}
async function removeItem(path: string, id: string) {
  if (backend === "rtdb" && rtdb) return remove(ref(rtdb, `${scoped(path)}/${id}`));
  if (backend === "firestore" && db) return deleteDoc(doc(db, scoped(path), id));
}

// ---------------------------------------------------------------
// Alert caregiver-state: alerts/{eventId}  (device events stay read-only)
// ---------------------------------------------------------------
export function subscribeAlertStates(
  cb: (states: Record<string, AlertState>) => void
): () => void {
  return subscribeMap<AlertState>(
    "alerts",
    (m) => {
      const out: Record<string, AlertState> = {};
      Object.entries(m).forEach(([id, s]) => (out[id] = { ...s, eventId: id, notes: s.notes ?? [] }));
      cb(out);
    },
    "alertStates",
    () => readKey<Record<string, AlertState>>("alertStates", {})
  );
}

export async function saveAlertState(state: AlertState) {
  if (!isDemo) return setItem("alerts", state.eventId, state);
  const all = readKey<Record<string, AlertState>>("alertStates", {});
  all[state.eventId] = state;
  writeKey("alertStates", all);
}

// ---------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------
const listFromMap = <T extends { id: string }>(m: Record<string, T>) =>
  Object.entries(m).map(([id, v]) => ({ ...v, id }));

export function subscribeReminders(cb: (r: Reminder[]) => void): () => void {
  return subscribeMap<Reminder>(
    "reminders",
    (m) => cb(listFromMap(m).map((r) => ({ ...r, days: r.days ?? [] }))),
    "reminders",
    () => Object.fromEntries(readKey<Reminder[]>("reminders", []).map((r) => [r.id, r]))
  );
}

export async function saveReminder(r: Reminder) {
  if (!isDemo) return setItem("reminders", r.id, r);
  const all = readKey<Reminder[]>("reminders", []);
  const i = all.findIndex((x) => x.id === r.id);
  if (i >= 0) all[i] = r;
  else all.push(r);
  writeKey("reminders", all);
}

export async function deleteReminder(id: string) {
  if (!isDemo) return removeItem("reminders", id);
  writeKey("reminders", readKey<Reminder[]>("reminders", []).filter((r) => r.id !== id));
}

// ---------------------------------------------------------------
// Family contacts
// ---------------------------------------------------------------
export function subscribeContacts(cb: (c: Contact[]) => void): () => void {
  return subscribeMap<Contact>(
    "contacts",
    (m) => cb(listFromMap(m)),
    "contacts",
    () => Object.fromEntries(readKey<Contact[]>("contacts", []).map((c) => [c.id, c]))
  );
}

export async function saveContact(c: Contact) {
  if (!isDemo) return setItem("contacts", c.id, c);
  const all = readKey<Contact[]>("contacts", []);
  const i = all.findIndex((x) => x.id === c.id);
  if (i >= 0) all[i] = c;
  else all.push(c);
  writeKey("contacts", all);
}

export async function deleteContact(id: string) {
  if (!isDemo) return removeItem("contacts", id);
  writeKey("contacts", readKey<Contact[]>("contacts", []).filter((c) => c.id !== id));
}

