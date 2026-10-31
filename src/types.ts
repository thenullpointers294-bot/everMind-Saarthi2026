// ---------- Device event stream (written by ESP32 pendant, READ-ONLY) ----------
export type DeviceEventType = "sos" | "possible_fall" | "ok" | "home" | "location";

export interface DeviceEvent {
  id: string;
  type: DeviceEventType;
  deviceId: string;
  hasFix: boolean;
  lat: number | null;
  lon: number | null;
  fixAgeMs?: number;
  experimental?: boolean; // only for possible_fall
  createdAt: number; // ms epoch (converted from Firestore Timestamp)
  uptimeMs: number;
}

// ---------- Caregiver alert state (separate collection: alerts/{eventId}) ----------
export type AlertStatus = "new" | "acknowledged" | "resolved";

export interface AlertState {
  eventId: string;
  status: AlertStatus;
  notes: { text: string; at: number }[];
  acknowledgedAt?: number;
  resolvedAt?: number;
  updatedAt: number;
}

// An alert = alert-worthy device event + caregiver state
export interface Alert {
  event: DeviceEvent;
  state: AlertState;
  kind: "sos" | "possible_fall" | "home";
  cancelledByOk?: boolean; // a later "ok" event cancelled a pending fall alert
}

// ---------- App data ----------
export interface Reminder {
  id: string;
  title: string;
  time: string; // "HH:MM"
  days: number[]; // 0=Sun ... 6=Sat, empty = every day
  type: "medicine" | "meal" | "activity" | "appointment" | "other";
  doneToday?: string; // ISO date when last marked done
}

export interface Contact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  color: string;
  isPrimary?: boolean;
}

export interface HomeLocation {
  lat: number;
  lon: number;
  label: string;
}

export type Role = "wearer" | "caregiver" | null;

export interface AppSettings {
  role: Role;
  wearerName: string;
  caregiverPin: string;
  deviceId: string;
  home: HomeLocation;
  developerMode: boolean;
}

export interface DeviceStatus {
  online: boolean;
  lastSeen: number | null; // last event of any type
  lastLocation: DeviceEvent | null; // latest event that carried a fix
  freshness: "recent" | "updated" | "old" | "none";
  lastOk: DeviceEvent | null;
  activeHomeRequest: DeviceEvent | null; // latest unresolved "home" event
}
