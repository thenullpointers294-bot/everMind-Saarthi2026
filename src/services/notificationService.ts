import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { DeviceEvent } from "../types";

const notifiedEventIds = new Set<string>();

/** Initialize channels and request permissions */
export async function initNotifications(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Create high-priority notification channel for Android 8.0+
      await LocalNotifications.createChannel({
        id: "emergency_alerts",
        name: "EverMind Emergency Alerts",
        description: "High priority notifications for Falls and SOS alerts",
        importance: 5, // High / heads-up banner with sound & vibration
        visibility: 1, // Visible on lock screen
        vibration: true,
      });

      // 2. Request permission on Android 13+
      const check = await LocalNotifications.checkPermissions();
      if (check.display !== "granted") {
        const req = await LocalNotifications.requestPermissions();
        return req.display === "granted";
      }
      return true;
    } catch (err) {
      console.warn("[Notifications] Native notification init error:", err);
      return false;
    }
  } else if ("Notification" in window) {
    try {
      if (Notification.permission === "default") {
        const res = await Notification.requestPermission();
        return res === "granted";
      }
      return Notification.permission === "granted";
    } catch {
      return false;
    }
  }
  return false;
}

/** Synthesize an emergency alert chime using Web Audio API */
function playEmergencyAlarm(isSOS: boolean) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isSOS ? "sawtooth" : "sine";
    osc.frequency.setValueAtTime(isSOS ? 880 : 587.33, ctx.currentTime); // A5 or D5
    osc.frequency.exponentialRampToValueAtTime(isSOS ? 1760 : 880, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.8);

    // Beep twice for SOS
    if (isSOS) {
      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = "sawtooth";
          osc2.frequency.setValueAtTime(880, ctx.currentTime);
          osc2.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.3);
          gain2.gain.setValueAtTime(0.3, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.8);
        } catch {
          // ignore
        }
      }, 400);
    }
  } catch {
    // AudioContext blocked or not supported
  }
}

/** Trigger alert notification for fall or SOS */
export async function notifyDeviceAlert(event: DeviceEvent, wearerName: string) {
  if (notifiedEventIds.has(event.id)) return;
  notifiedEventIds.add(event.id);

  const isSOS = event.type === "sos";
  const isFall = event.type === "possible_fall";
  const isOk = event.type === "ok";

  if (!isSOS && !isFall && !isOk) return;

  // 1. Play high-priority audible chime
  playEmergencyAlarm(isSOS);

  // 2. Hardware vibration
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(isSOS ? [500, 200, 500, 200, 800] : [300, 150, 300]);
    } catch {
      // ignore
    }
  }

  const title = isSOS
    ? `🚨 EMERGENCY SOS: ${wearerName}`
    : isFall
      ? `⚠️ FALL DETECTED: ${wearerName}`
      : `✅ Alert Resolved: ${wearerName}`;

  const loc = event.lat && event.lon ? `📍 Near ${event.lat.toFixed(4)}, ${event.lon.toFixed(4)}` : "";
  const body = isSOS
    ? `Emergency SOS button pressed on pendant! ${loc}`
    : isFall
      ? `A fall impact was registered. Verify wearer safety! ${loc}`
      : `${wearerName} cancelled the alert and is safe.`;

  // Native Android Capacitor notification
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.abs(event.createdAt % 2147483647),
            channelId: "emergency_alerts",
            extra: {
              eventId: event.id,
              type: event.type,
            },
          },
        ],
      });
    } catch (err) {
      console.error("[Notifications] Failed to schedule native notification:", err);
    }
  }

  // Web / PWA system notification
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      try {
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification(title, {
            body,
            icon: "./icons/icon-512.png",
            badge: "./icons/icon-512.png",
            tag: event.id,
            requireInteraction: true,
            data: { url: "./#/caregiver/alerts" },
          });
        } else {
          new Notification(title, {
            body,
            icon: "./icons/icon-512.png",
            tag: event.id,
          });
        }
      } catch {
        try {
          new Notification(title, { body, tag: event.id });
        } catch (e) {
          console.warn("[Notifications] Web notification fallback error:", e);
        }
      }
    } else if (Notification.permission === "default") {
      // Prompt user for permission on the fly
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          try {
            new Notification(title, { body, tag: event.id });
          } catch {
            // ignore
          }
        }
      });
    }
  }
}
