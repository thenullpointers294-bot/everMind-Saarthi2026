import { useState, useEffect } from "react";
import { 
  AlertOctagon, 
  Navigation, 
  MapPin, 
  Clock, 
  Phone, 
  CheckCircle2, 
  HeartHandshake,
  RefreshCw,
  Compass,
  Crosshair
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { simulator, calculateDistanceMeters } from "../../services/deviceService";
import { broadcastDeviceLocation, watchDeviceCoordinates, type GeoCoords } from "../../services/geoService";
import { nextReminder, formatTime12 } from "../../utils/reminderUtils";
import { DemoBadge } from "../../components/ui";
import LocationPickerModal from "../../components/LocationPickerModal";

export default function WearerHome() {
  const { settings, reminders, contacts, now } = useApp();
  const [sent, setSent] = useState<"sos" | "home" | null>(null);

  // Device Geolocation State
  const [geoCoords, setGeoCoords] = useState<GeoCoords | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "syncing" | "active" | "error">("idle");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const handleManualLocation = async (coords: { lat: number; lon: number; label?: string }) => {
    setGeoCoords({
      lat: coords.lat,
      lon: coords.lon,
      accuracy: 5,
      timestamp: Date.now(),
      source: "gps",
      city: coords.label,
    });
    setGeoStatus("active");
    await broadcastDeviceLocation(settings.deviceId, "location", { lat: coords.lat, lon: coords.lon });
  };

  const syncLocation = async (silent = false) => {
    if (!silent) setGeoStatus("syncing");
    try {
      const coords = await broadcastDeviceLocation(settings.deviceId, "location");
      setGeoCoords(coords);
      setGeoStatus("active");
      setGeoError(null);
      setLastSyncTime(new Date());
    } catch (err) {
      if (!silent) {
        setGeoStatus("error");
        setGeoError(err instanceof Error ? err.message : "Could not acquire device location");
      }
    }
  };

  // Continuous live hardware GPS tracker (matches Google Maps blue dot behavior)
  useEffect(() => {
    let lastBroadcastMs = 0;
    let lastBroadcastCoord: { lat: number; lon: number } | null = null;

    const maybeBroadcast = (coords: { lat: number; lon: number }, force = false) => {
      const now = Date.now();
      let shouldSend = force || now - lastBroadcastMs >= 20000;
      if (!shouldSend && lastBroadcastCoord) {
        const movedMeters = calculateDistanceMeters(
          lastBroadcastCoord.lat,
          lastBroadcastCoord.lon,
          coords.lat,
          coords.lon
        );
        if (movedMeters > 25) {
          shouldSend = true;
        }
      }
      if (shouldSend) {
        lastBroadcastMs = now;
        lastBroadcastCoord = { lat: coords.lat, lon: coords.lon };
        broadcastDeviceLocation(settings.deviceId, "location", {
          lat: coords.lat,
          lon: coords.lon,
        });
      }
    };

    syncLocation(false);

    const unwatch = watchDeviceCoordinates(
      (liveCoords) => {
        setGeoCoords(liveCoords);
        setGeoStatus("active");
        setGeoError(null);
        maybeBroadcast(liveCoords, false);
      },
      (err) => {
        if (err.code === 1) {
          setGeoError("Location permission denied. Click below to allow or pick on map.");
        }
      }
    );

    const timer = setInterval(() => {
      if (geoCoords) {
        maybeBroadcast(geoCoords, true);
      }
    }, 30000);

    return () => {
      unwatch();
      clearInterval(timer);
    };
  }, [settings.deviceId]);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeStr = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const next = nextReminder(reminders, now);
  const primary = contacts.find((c) => c.isPrimary) ?? contacts[0];

  const distance = geoCoords
    ? calculateDistanceMeters(geoCoords.lat, geoCoords.lon, settings.home.lat, settings.home.lon)
    : null;

  const sendSOS = async () => {
    try {
      await broadcastDeviceLocation(settings.deviceId, "sos");
    } catch {
      await simulator.pressSOS(settings.deviceId);
    }
    setSent("sos");
    setTimeout(() => setSent(null), 6000);
  };

  const sendHome = async () => {
    try {
      await broadcastDeviceLocation(settings.deviceId, "home");
    } catch {
      await simulator.pressHome(settings.deviceId);
    }
    setSent("home");
    setTimeout(() => setSent(null), 6000);
  };

  return (
    <div className="pb-28 bg-slate-50 min-h-dvh">
      {/* Aesthetic Top Greeting Header */}
      <div className="bg-white border-b border-slate-200/80 px-6 pt-10 pb-7 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span>{greeting}</span>
          <DemoBadge />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
          {settings.wearerName}
        </h1>
        <div className="mt-3 flex items-center justify-between text-slate-500 text-sm">
          <span>{dateStr}</span>
          <span className="font-semibold text-slate-900 font-mono bg-slate-100 px-2.5 py-1 rounded-lg">
            {timeStr}
          </span>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4 max-w-md mx-auto">
        {/* Device Live GPS Location card */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div className={`p-2.5 rounded-xl shrink-0 ${geoStatus === "active" ? "bg-emerald-50 text-emerald-700" : geoStatus === "syncing" ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-700"}`}>
                <Crosshair className={`w-5 h-5 stroke-[2] ${geoStatus === "syncing" ? "animate-spin" : ""}`} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Location
                  </span>
                  {geoStatus === "active" && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Live
                    </span>
                  )}
                </div>
                <p className="font-semibold text-slate-900 text-base leading-snug mt-0.5">
                  {geoCoords
                    ? distance != null && distance <= 250
                      ? `Safe at home${geoCoords.city ? ` in ${geoCoords.city}` : ""}`
                      : `Away from home (~${distance != null && distance < 1000 ? `${distance}m` : `${((distance ?? 0) / 1000).toFixed(1)}km`})${geoCoords.city ? ` · ${geoCoords.city}` : ""}`
                    : geoStatus === "syncing"
                    ? "Acquiring location..."
                    : "Tap to share location"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {geoCoords?.city ? geoCoords.city : settings.home.label}
                </p>
              </div>
            </div>

            <button
              onClick={() => syncLocation(false)}
              disabled={geoStatus === "syncing"}
              title="Sync current phone/laptop location"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer shrink-0 disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${geoStatus === "syncing" ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Action Row: Pick exact map position or retry */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
            <button
              onClick={() => setShowPicker(true)}
              className="text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-xl border border-sky-200/80 transition cursor-pointer flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Choose Location on Map</span>
            </button>
          </div>
        </div>

        {showPicker && (
          <LocationPickerModal
            initialLat={geoCoords?.lat ?? settings.home.lat}
            initialLon={geoCoords?.lon ?? settings.home.lon}
            onSelect={handleManualLocation}
            onClose={() => setShowPicker(false)}
          />
        )}

        {/* Next reminder */}
        {next && (
          <div className="rounded-2xl bg-white border border-amber-200/80 p-4 shadow-sm flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 shrink-0">
              <Clock className="w-5 h-5 stroke-[2]" />
            </div>
            <div className="flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Upcoming Reminder
              </span>
              <p className="font-semibold text-slate-900 text-sm mt-0.5">{next.title}</p>
              <p className="text-xs text-slate-500 font-medium">Scheduled at {formatTime12(next.time)}</p>
            </div>
          </div>
        )}

        {/* Confirmation toast */}
        {sent && (
          <div className="rounded-2xl bg-emerald-700 text-white p-4 text-center font-medium shadow-md flex items-center justify-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-5 h-5" />
            <span>
              {sent === "sos"
                ? "Help alert sent. Caregivers have been notified."
                : "Opening Google Maps directions to home. Caregiver notified."}
            </span>
          </div>
        )}

        {/* High-visibility tactile SOS button */}
        <button
          onClick={sendSOS}
          className="w-full rounded-2xl bg-rose-600 hover:bg-rose-700 text-white py-6 px-5 shadow-[0_4px_16px_rgba(225,29,72,0.25)] active:scale-[0.98] transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5"
        >
          <AlertOctagon className="w-10 h-10 animate-pulse stroke-[2]" />
          <span className="text-xl font-bold tracking-tight">I Need Help</span>
          <span className="text-rose-100 text-xs font-normal">
            Press to alert your family immediately
          </span>
        </button>

        {/* Take me home */}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${settings.home.lat},${settings.home.lon}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={sendHome}
          className="w-full rounded-2xl bg-slate-900 hover:bg-slate-800 text-white py-4 px-5 shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center justify-between no-underline"
        >
          <div className="flex items-center gap-3">
            <Navigation className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-semibold tracking-tight">Take Me Home</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Google Maps ↗
          </span>
        </a>

        {/* Call family section */}
        <div className="pt-2">
          <p className="px-1 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
            Quick Family Contacts
          </p>
          <div className="space-y-2">
            {contacts.slice(0, 3).map((c) => (
              <a
                key={c.id}
                href={`tel:${c.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-3.5 rounded-2xl bg-white border border-slate-200/80 p-3.5 shadow-sm active:scale-[0.99] transition-all hover:border-slate-300"
              >
                <span
                  className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ background: c.color }}
                >
                  {c.name[0]}
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-slate-900 text-sm">
                    {c.name} {c.id === primary?.id && "· Primary"}
                  </span>
                  <span className="block text-xs text-slate-500">{c.relation}</span>
                </span>
                <span className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </span>
              </a>
            ))}
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 pt-3 pb-2 leading-relaxed">
          EverMind is a supportive routine companion, not a medical device.
        </p>
      </div>
    </div>
  );
}
