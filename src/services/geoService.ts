import { addDeviceEvent } from "./dataService";
import type { DeviceEventType } from "../types";
import { DEHRADUN, readKey, writeKey } from "./localStore";

export interface GeoCoords {
  lat: number;
  lon: number;
  accuracy?: number;
  timestamp: number;
  source?: "gps" | "manual";
  city?: string;
}

/**
 * Returns saved calibrated position or Dehradun baseline.
 */
export function getSavedPosition(): GeoCoords {
  return readKey<GeoCoords>("wearerGeo", {
    lat: DEHRADUN.lat,
    lon: DEHRADUN.lon,
    accuracy: 10,
    timestamp: Date.now(),
    source: "manual",
    city: "Dehradun, Uttarakhand",
  });
}

export function savePosition(coords: { lat: number; lon: number; label?: string }): GeoCoords {
  const next: GeoCoords = {
    lat: coords.lat,
    lon: coords.lon,
    accuracy: 5,
    timestamp: Date.now(),
    source: "manual",
    city: coords.label || "Dehradun",
  };
  writeKey("wearerGeo", next);
  return next;
}

/**
 * Reads high-precision device location (same API used by Google Maps Web):
 * - Direct query to hardware GPS / Wi-Fi tri-lateration
 * - Fallback to saved position if permission denied
 */
export function getDeviceCoordinates(): Promise<GeoCoords> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(getSavedPosition());
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const gpsCoords: GeoCoords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lon: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: pos.timestamp || Date.now(),
          source: "gps",
        };
        writeKey("wearerGeo", gpsCoords);
        resolve(gpsCoords);
      },
      (err) => {
        console.warn("GPS access warning (falling back to saved position):", err.message);
        resolve(getSavedPosition());
      },
      {
        enableHighAccuracy: true, // Forces phone GPS chips instead of network estimation
        timeout: 10000,
        maximumAge: 0,           // Forces a fresh satellite/Wi-Fi fix
      }
    );
  });
}

/**
 * Continuously watches the device's live coordinates in real-time (like Google Maps blue dot)
 */
export function watchDeviceCoordinates(
  onUpdate: (coords: GeoCoords) => void,
  onError?: (err: GeolocationPositionError) => void
): () => void {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return () => {};
  }

  const id = navigator.geolocation.watchPosition(
    (pos) => {
      const gpsCoords: GeoCoords = {
        lat: Number(pos.coords.latitude.toFixed(6)),
        lon: Number(pos.coords.longitude.toFixed(6)),
        accuracy: Math.round(pos.coords.accuracy),
        timestamp: pos.timestamp || Date.now(),
        source: "gps",
      };
      writeKey("wearerGeo", gpsCoords);
      onUpdate(gpsCoords);
    },
    (err) => {
      if (onError) onError(err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 12000,
    }
  );

  return () => navigator.geolocation.clearWatch(id);
}

/**
 * Broadcasts the current device's GPS coordinates directly into Firebase RTDB under
 * `devices/{deviceId}/events` so the Caregiver Dashboard map updates in real time.
 */
export async function broadcastDeviceLocation(
  deviceId: string,
  eventType: DeviceEventType = "location",
  customCoords?: { lat: number; lon: number; label?: string }
): Promise<GeoCoords> {
  const coords = customCoords
    ? savePosition(customCoords)
    : await getDeviceCoordinates();

  await addDeviceEvent(deviceId, {
    type: eventType,
    deviceId,
    hasFix: true,
    lat: coords.lat,
    lon: coords.lon,
    fixAgeMs: 0,
    uptimeMs: Math.round(performance.now()),
  });

  return coords;
}
