// localStorage-backed demo store with a tiny pub/sub so UI updates in real time,
// mirroring Firestore onSnapshot behaviour when Firebase env vars are absent.
import type {
  AlertState,
  AppSettings,
  Contact,
  DeviceEvent,
  Reminder,
} from "../types";

const PREFIX = "mg:";

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

export function subscribeKey(key: string, fn: Listener): () => void {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(fn);
  return () => listeners.get(key)?.delete(fn);
}

function emit(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

export function readKey<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeKey<T>(key: string, value: T) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
  emit(key);
}

// ---------------- Demo seed ----------------
export const DEHRADUN = { lat: 30.3165, lon: 78.0322 };

const now = Date.now();

const seedEvents: DeviceEvent[] = [
  {
    id: "ev-seed-1",
    type: "location",
    deviceId: "mg-demo-01",
    hasFix: true,
    lat: DEHRADUN.lat + 0.0012,
    lon: DEHRADUN.lon + 0.0008,
    fixAgeMs: 2100,
    createdAt: now - 40 * 1000,
    uptimeMs: 5_400_000,
  },
  {
    id: "ev-seed-2",
    type: "location",
    deviceId: "mg-demo-01",
    hasFix: true,
    lat: DEHRADUN.lat + 0.0009,
    lon: DEHRADUN.lon + 0.0004,
    fixAgeMs: 1800,
    createdAt: now - 6 * 60 * 1000,
    uptimeMs: 5_100_000,
  },
  {
    id: "ev-seed-3",
    type: "possible_fall",
    deviceId: "mg-demo-01",
    hasFix: true,
    lat: DEHRADUN.lat + 0.0006,
    lon: DEHRADUN.lon - 0.0003,
    experimental: true,
    createdAt: now - 50 * 60 * 1000,
    uptimeMs: 2_300_000,
  },
  {
    id: "ev-seed-4",
    type: "ok",
    deviceId: "mg-demo-01",
    hasFix: false,
    lat: null,
    lon: null,
    createdAt: now - 48 * 60 * 1000,
    uptimeMs: 2_420_000,
  },
  {
    id: "ev-seed-5",
    type: "sos",
    deviceId: "mg-demo-01",
    hasFix: true,
    lat: DEHRADUN.lat - 0.002,
    lon: DEHRADUN.lon + 0.0025,
    fixAgeMs: 900,
    createdAt: now - 26 * 60 * 60 * 1000,
    uptimeMs: 800_000,
  },
];

const seedAlertStates: Record<string, AlertState> = {
  "ev-seed-5": {
    eventId: "ev-seed-5",
    status: "resolved",
    notes: [
      { text: "Called Papa, he pressed SOS by accident while gardening.", at: now - 25.5 * 60 * 60 * 1000 },
    ],
    acknowledgedAt: now - 25.8 * 60 * 60 * 1000,
    resolvedAt: now - 25.5 * 60 * 60 * 1000,
    updatedAt: now - 25.5 * 60 * 60 * 1000,
  },
};

const seedReminders: Reminder[] = [
  { id: "r1", title: "Take blood-pressure tablet", time: "08:00", days: [], type: "medicine" },
  { id: "r2", title: "Drink a glass of water", time: "11:00", days: [], type: "activity" },
  { id: "r3", title: "Lunch time", time: "13:00", days: [], type: "meal" },
  { id: "r4", title: "Evening walk with Asha", time: "17:30", days: [1, 3, 5], type: "activity" },
  { id: "r5", title: "Night medicine", time: "21:00", days: [], type: "medicine" },
];

const seedContacts: Contact[] = [
  { id: "c1", name: "Asha", relation: "Daughter", phone: "+91 98100 11111", color: "#0d9488", isPrimary: true },
  { id: "c2", name: "Rohan", relation: "Son", phone: "+91 98100 22222", color: "#7c3aed" },
  { id: "c3", name: "Dr. Mehta", relation: "Family doctor", phone: "+91 98100 33333", color: "#2563eb" },
];

export const defaultSettings: AppSettings = {
  role: null,
  wearerName: "Dadaji",
  caregiverPin: "1234",
  deviceId: "mg-demo-01",
  home: { ...DEHRADUN, label: "Home — 12 Rajpur Road, Dehradun" },
  developerMode: false,
};

export function ensureSeeded() {
  if (!localStorage.getItem(PREFIX + "seeded")) {
    writeKey("events", seedEvents);
    writeKey("alertStates", seedAlertStates);
    writeKey("reminders", seedReminders);
    writeKey("contacts", seedContacts);
    writeKey("settings", defaultSettings);
    localStorage.setItem(PREFIX + "seeded", "1");
  }
}
