import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Radio, Navigation, AlertTriangle, ArrowRight, CheckCircle, MapPin, ExternalLink, Home, Crosshair } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { deriveStatus, timeAgo, calculateDistanceMeters } from "../../services/deviceService";
import { broadcastDeviceLocation } from "../../services/geoService";
import MapView, { type MapMarker } from "../../components/MapView";
import { Badge, Card, FreshnessBadge, PageHeader } from "../../components/ui";
import { LinkPatientCard } from "../../components/Pairing";
import CognitiveSummary from "../../components/CognitiveSummary";
import LocationPickerModal from "../../components/LocationPickerModal";

export default function Dashboard() {
  const { settings, updateSettings, device, now, session, games } = useApp();
  const [showPicker, setShowPicker] = useState(false);
  // Recompute online/freshness on every clock tick so badges stay accurate
  const status = device
    ? {
        ...deriveStatus(device.events, now.getTime()),
        activeHomeRequest: device.status.activeHomeRequest,
      }
    : undefined;
  const loc = status?.lastLocation ?? null;
  const homeReq = status?.activeHomeRequest ?? null;
  const openAlerts = (device?.alerts ?? []).filter(
    (a) => a.state.status !== "resolved" && !a.cancelledByOk
  );

  const distMeters =
    loc && loc.lat != null && loc.lon != null
      ? calculateDistanceMeters(loc.lat, loc.lon, settings.home.lat, settings.home.lon)
      : null;
  const isInsideSafeZone = distMeters != null ? distMeters <= 250 : true;

  // Memoised so the map only re-fits when the location/home actually changes
  const markers: MapMarker[] = useMemo(() => {
    const m: MapMarker[] = [];
    if (loc && loc.lat != null && loc.lon != null) {
      m.push({
        lat: loc.lat,
        lon: loc.lon,
        kind: homeReq ? "alert" : "wearer",
        label: `${settings.wearerName} — live location (${timeAgo(loc.createdAt)})`,
      });
    }
    m.push({
      lat: settings.home.lat,
      lon: settings.home.lon,
      kind: "home",
      label: settings.home.label,
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc?.id, loc?.lat, loc?.lon, homeReq?.id, settings.home, settings.wearerName]);

  return (
    <div className="pb-28 min-h-dvh bg-slate-50">
      <PageHeader
        title="Dashboard"
        subtitle={
          session?.linkedCode
            ? `Active oversight for ${settings.wearerName}`
            : "Connect to a wearer to view live telemetry"
        }
        right={
          settings.developerMode ? (
            <Link
              to="/dev/simulator"
              className="rounded-xl bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 shadow-sm hover:bg-slate-800 transition"
            >
              Simulator
            </Link>
          ) : undefined
        }
      />
      <div className="px-5 space-y-4 max-w-md mx-auto">
        {typeof window !== "undefined" && "Notification" in window && Notification.permission === "default" && (
          <div className="rounded-2xl bg-indigo-50 border border-indigo-200/80 p-3.5 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🔔</span>
              <div>
                <p className="text-xs font-bold text-indigo-950">Enable Alert Push Notifications</p>
                <p className="text-[11px] text-indigo-700">Receive instant sound and vibration when SOS or fall occurs</p>
              </div>
            </div>
            <button
              onClick={() => {
                Notification.requestPermission();
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition cursor-pointer shrink-0"
            >
              Allow
            </button>
          </div>
        )}

        {!session?.linkedCode && <LinkPatientCard />}

        {/* Device status */}
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <Radio className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">Pendant {settings.deviceId}</p>
                <p className="text-xs text-slate-500">
                  Last seen: {timeAgo(status?.lastSeen ?? null)}
                </p>
              </div>
            </div>
            {status?.online ? (
              <Badge tone="green">Online</Badge>
            ) : (
              <Badge tone="slate">Offline</Badge>
            )}
          </div>
          {status?.lastOk && Date.now() - status.lastOk.createdAt < 60 * 60 * 1000 && (
            <div className="mt-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 px-3 py-2 text-xs font-medium text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Wearer confirmed safe ("I'm OK") {timeAgo(status.lastOk.createdAt)}</span>
            </div>
          )}
        </Card>

        {/* Take me home request */}
        {homeReq && (
          <div className="rounded-2xl bg-slate-900 text-white p-4.5 shadow-sm border border-slate-800">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <Navigation className="w-4 h-4" />
              <span>"Take me home" requested</span>
            </div>
            <p className="text-slate-300 text-xs mt-1 leading-relaxed">
              {settings.wearerName} requested navigation assistance {timeAgo(homeReq.createdAt)}. The suggested route is plotted on the map.
            </p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Link
                to="/caregiver/alerts"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition"
              >
                <span>Manage Request</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <a
                href={
                  homeReq.lat && homeReq.lon
                    ? `https://www.google.com/maps/dir/?api=1&origin=${homeReq.lat},${homeReq.lon}&destination=${settings.home.lat},${settings.home.lon}`
                    : `https://www.google.com/maps/dir/?api=1&destination=${settings.home.lat},${settings.home.lon}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition no-underline"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Open in Google Maps ↗</span>
              </a>
            </div>
          </div>
        )}

        {/* Open alerts banner */}
        {openAlerts.length > 0 && (
          <Link
            to="/caregiver/alerts"
            className="flex items-center justify-between rounded-2xl bg-rose-600 hover:bg-rose-700 text-white p-4 shadow-sm transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-white" />
              <div>
                <p className="font-semibold text-sm">
                  {openAlerts.length} unresolved safety alert{openAlerts.length > 1 ? "s" : ""}
                </p>
                <p className="text-rose-100 text-xs">Tap to review telemetry and take action</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-rose-200" />
          </Link>
        )}

        {/* Map */}
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2.5 px-1 pt-1">
            <p className="font-semibold text-slate-900 text-xs tracking-wide uppercase">Live Location</p>
            <FreshnessBadge freshness={status?.freshness ?? "none"} />
          </div>
          <MapView markers={markers} routeToHome={Boolean(homeReq)} height={300} />
          {loc && loc.lat != null && loc.lon != null ? (
            <div className="mt-3 px-1 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-mono text-slate-800 font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>{loc.lat.toFixed(5)}, {loc.lon.toFixed(5)}</span>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${loc.lat},${loc.lon}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {distMeters != null && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                      isInsideSafeZone
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                        : "bg-rose-50 text-rose-800 border border-rose-200/80 font-semibold"
                    }`}
                  >
                    {isInsideSafeZone ? "At Home" : "Away from Home"} ({distMeters}m)
                  </span>
                )}

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-700">
                  Updated {timeAgo(loc.createdAt)}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-2.5 px-1 flex items-center justify-between">
              <p className="text-[11px] text-slate-500">
                Home coordinates shown.
              </p>
              <button
                onClick={() => setShowPicker(true)}
                className="text-[11px] font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200/80 transition cursor-pointer flex items-center gap-1"
              >
                <Crosshair className="w-3 h-3" />
                <span>Adjust on Map</span>
              </button>
            </div>
          )}

          {/* Calibrate location button */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between px-1">
            <span className="text-[11px] text-slate-400">Set custom pin for testing?</span>
            <button
              onClick={() => setShowPicker(true)}
              className="text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-xl border border-sky-200/80 transition cursor-pointer flex items-center gap-1.5"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Set on Map</span>
            </button>
          </div>
        </Card>

        {showPicker && (
          <LocationPickerModal
            initialLat={loc?.lat ?? settings.home.lat}
            initialLon={loc?.lon ?? settings.home.lon}
            onSelect={async (coords) => {
              await broadcastDeviceLocation(settings.deviceId, "location", {
                lat: coords.lat,
                lon: coords.lon,
              });
            }}
            onClose={() => setShowPicker(false)}
          />
        )}

        {/* Doctor Cognitive Summary & Trends */}
        <CognitiveSummary games={games} wearerName={settings.wearerName} />

        <p className="text-center text-[11px] text-slate-400 leading-relaxed pt-1">
          Location displayed is the latest transmitted by the pendant. EverMind is a supportive routine companion, not a medical or emergency-response service.
        </p>
      </div>
    </div>
  );
}
