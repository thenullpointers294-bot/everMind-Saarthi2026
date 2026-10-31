// =====================================================================
// deviceService — listens to the latest pendant events and converts
// them into app state (device status, alerts, home requests).
// =====================================================================
import type {
  Alert,
  AlertState,
  DeviceEvent,
  DeviceStatus,
} from "../types";
import {
  addDeviceEvent,
  subscribeAlertStates,
  subscribeEvents,
} from "./dataService";
import { DEHRADUN, readKey, writeKey } from "./localStore";

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const RECENT_MS = 60 * 1000;
const UPDATED_MS = 10 * 60 * 1000;

export function deriveStatus(events: DeviceEvent[], now = Date.now()): DeviceStatus {
  const lastSeen = events.length ? events[0].createdAt : null;
  const lastLocation =
    events.find((e) => e.hasFix && e.lat != null && e.lon != null) ?? null;
  const lastLocEvent = events.find((e) => e.type === "location") ?? null;
  const online =
    lastLocEvent != null && now - lastLocEvent.createdAt < ONLINE_WINDOW_MS;

  let freshness: DeviceStatus["freshness"] = "none";
  if (lastLocation) {
    const age = now - lastLocation.createdAt;
    freshness = age < RECENT_MS ? "recent" : age < UPDATED_MS ? "updated" : "old";
  }

  const lastOk = events.find((e) => e.type === "ok") ?? null;
  return {
    online,
    lastSeen,
    lastLocation,
    freshness,
    lastOk,
    activeHomeRequest: null, // filled by deriveAlerts
  };
}

export function deriveAlerts(
  events: DeviceEvent[],
  states: Record<string, AlertState>
): Alert[] {
  const okEvents = events.filter((e) => e.type === "ok");
  return events
    .filter((e) => e.type === "sos" || e.type === "possible_fall" || e.type === "home")
    .map((event) => {
      const state: AlertState = states[event.id] ?? {
        eventId: event.id,
        status: "new",
        notes: [],
        updatedAt: event.createdAt,
      };
      // A later "I'm OK" press cancels a pending possible-fall alert
      const cancelledByOk =
        event.type === "possible_fall" &&
        state.status !== "resolved" &&
        okEvents.some((ok) => ok.createdAt > event.createdAt);
      return {
        event,
        state,
        kind: event.type as Alert["kind"],
        cancelledByOk,
      };
    });
}

export function activeHomeRequest(alerts: Alert[]): DeviceEvent | null {
  const req = alerts.find(
    (a) => a.kind === "home" && a.state.status !== "resolved"
  );
  return req ? req.event : null;
}

export interface DeviceSnapshot {
  events: DeviceEvent[];
  alertStates: Record<string, AlertState>;
  status: DeviceStatus;
  alerts: Alert[];
}

/** Subscribe to everything the caregiver dashboard needs. */
export function subscribeDevice(
  deviceId: string,
  cb: (snap: DeviceSnapshot) => void
): () => void {
  let events: DeviceEvent[] = [];
  let states: Record<string, AlertState> = {};

  const push = () => {
    const alerts = deriveAlerts(events, states);
    const status = deriveStatus(events);
    status.activeHomeRequest = activeHomeRequest(alerts);
    cb({ events, alertStates: states, status, alerts });
  };

  const u1 = subscribeEvents(deviceId, (e) => {
    events = e;
    push();
  });
  const u2 = subscribeAlertStates((s) => {
    states = s;
    push();
  });
  return () => {
    u1();
    u2();
  };
}

// ---------------------------------------------------------------
// Pendant simulator — writes the SAME event format as the ESP32
// ---------------------------------------------------------------
function simPos(): { lat: number; lon: number } {
  return readKey("simPos", { lat: DEHRADUN.lat, lon: DEHRADUN.lon });
}

function base(deviceId: string, withFix = true) {
  const p = simPos();
  return {
    deviceId,
    hasFix: withFix,
    lat: withFix ? p.lat : null,
    lon: withFix ? p.lon : null,
    fixAgeMs: withFix ? Math.floor(Math.random() * 4000) + 500 : undefined,
    uptimeMs: Math.floor(performance.now()) + 3_600_000,
  };
}

export const simulator = {
  sendLocation(deviceId: string) {
    return addDeviceEvent(deviceId, { type: "location", ...base(deviceId) });
  },
  moveLocation(deviceId: string) {
    const p = simPos();
    const next = {
      lat: p.lat + (Math.random() - 0.5) * 0.002,
      lon: p.lon + (Math.random() - 0.5) * 0.002,
    };
    writeKey("simPos", next);
    return addDeviceEvent(deviceId, { type: "location", ...base(deviceId) , lat: next.lat, lon: next.lon });
  },
  pressSOS(deviceId: string) {
    return addDeviceEvent(deviceId, { type: "sos", ...base(deviceId) });
  },
  triggerFall(deviceId: string) {
    return addDeviceEvent(deviceId, {
      type: "possible_fall",
      experimental: true,
      ...base(deviceId),
    });
  },
  pressOk(deviceId: string) {
    return addDeviceEvent(deviceId, { type: "ok", ...base(deviceId, false) });
  },
  pressHome(deviceId: string) {
    return addDeviceEvent(deviceId, { type: "home", ...base(deviceId) });
  },
};

// ---------------- formatting helpers ----------------
export function timeAgo(ms: number | null): string {
  if (!ms) return "never";
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}
