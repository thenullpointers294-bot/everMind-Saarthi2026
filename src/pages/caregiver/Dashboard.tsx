import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { deriveStatus, timeAgo } from "../../services/deviceService";
import MapView, { type MapMarker } from "../../components/MapView";
import { Badge, Card, FreshnessBadge, PageHeader } from "../../components/ui";
import { LinkPatientCard } from "../../components/Pairing";

export default function Dashboard() {
  const { settings, device, now, session } = useApp();
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

  // Memoised so the map only re-fits when the location/home actually changes
  const markers: MapMarker[] = useMemo(() => {
    const m: MapMarker[] = [];
    if (loc && loc.lat != null && loc.lon != null) {
      m.push({
        lat: loc.lat,
        lon: loc.lon,
        kind: homeReq ? "alert" : "wearer",
        label: `${settings.wearerName} — latest available location (${timeAgo(loc.createdAt)})`,
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
            ? `Watching over ${settings.wearerName}`
            : "Connect to a patient to get started"
        }
        right={
          settings.developerMode ? (
            <Link
              to="/dev/simulator"
              className="rounded-xl bg-slate-900 text-white text-xs font-bold px-3 py-2"
            >
              🛠 Simulator
            </Link>
          ) : undefined
        }
      />
      <div className="px-4 space-y-4 max-w-md mx-auto">
        {!session?.linkedCode && <LinkPatientCard />}

        {/* Device status */}
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-teal-100 flex items-center justify-center text-xl">
                📿
              </div>
              <div>
                <p className="font-bold text-slate-800">Pendant {settings.deviceId}</p>
                <p className="text-xs text-slate-500">
                  Last event: {timeAgo(status?.lastSeen ?? null)}
                </p>
              </div>
            </div>
            {status?.online ? (
              <Badge tone="green">● Online</Badge>
            ) : (
              <Badge tone="slate">○ Offline / last seen {timeAgo(status?.lastSeen ?? null)}</Badge>
            )}
          </div>
          {status?.lastOk && Date.now() - status.lastOk.createdAt < 60 * 60 * 1000 && (
            <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700">
              ✅ Wearer pressed "I'm OK" {timeAgo(status.lastOk.createdAt)}
            </div>
          )}
        </Card>

        {/* Take me home request */}
        {homeReq && (
          <div className="rounded-2xl bg-sky-600 text-white p-4 shadow-lg">
            <p className="font-bold text-lg">🏠 "Take me home" request</p>
            <p className="text-sky-100 text-sm">
              {settings.wearerName} asked to go home {timeAgo(homeReq.createdAt)}. The route to home
              is shown on the map below.
            </p>
            <Link
              to="/caregiver/alerts"
              className="mt-2 inline-block rounded-lg bg-white/20 px-3 py-1.5 text-sm font-bold"
            >
              Manage request →
            </Link>
          </div>
        )}

        {/* Open alerts banner */}
        {openAlerts.length > 0 && (
          <Link
            to="/caregiver/alerts"
            className="block rounded-2xl bg-rose-600 text-white p-4 shadow-lg"
          >
            <p className="font-bold text-lg">
              🚨 {openAlerts.length} open alert{openAlerts.length > 1 ? "s" : ""}
            </p>
            <p className="text-rose-100 text-sm">Tap to review and respond.</p>
          </Link>
        )}

        {/* Map */}
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="font-bold text-slate-800 text-sm">Latest available location</p>
            <FreshnessBadge freshness={status?.freshness ?? "none"} />
          </div>
          <MapView markers={markers} routeToHome={Boolean(homeReq)} height={300} />
          {loc ? (
            <p className="mt-2 px-1 text-xs text-slate-500">
              {loc.lat?.toFixed(5)}, {loc.lon?.toFixed(5)} · fix age{" "}
              {loc.fixAgeMs != null ? `${(loc.fixAgeMs / 1000).toFixed(1)}s` : "—"} · received{" "}
              {timeAgo(loc.createdAt)}
            </p>
          ) : (
            <p className="mt-2 px-1 text-xs text-slate-500">
              No GPS fix received yet. The home location is shown.
            </p>
          )}
        </Card>

        <p className="text-center text-[11px] text-slate-400 leading-relaxed">
          Location shown is the latest the pendant reported — it may not be the current position.
          Memory Guardian is not a medical or emergency-response device.
        </p>
      </div>
    </div>
  );
}
