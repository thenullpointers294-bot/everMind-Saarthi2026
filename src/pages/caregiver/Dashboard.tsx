import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Radio, Navigation, AlertTriangle, ArrowRight, CheckCircle } from "lucide-react";
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
        label: `${settings.wearerName} — latest location (${timeAgo(loc.createdAt)})`,
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
            <Link
              to="/caregiver/alerts"
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition"
            >
              <span>Manage Request</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
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
          {loc ? (
            <p className="mt-2.5 px-1 text-[11px] text-slate-500 font-mono">
              {loc.lat?.toFixed(5)}, {loc.lon?.toFixed(5)} · fix {loc.fixAgeMs != null ? `${(loc.fixAgeMs / 1000).toFixed(1)}s` : "—"} · received {timeAgo(loc.createdAt)}
            </p>
          ) : (
            <p className="mt-2.5 px-1 text-[11px] text-slate-500">
              No live GPS fix reported yet. Home coordinates shown.
            </p>
          )}
        </Card>

        <p className="text-center text-[11px] text-slate-400 leading-relaxed pt-1">
          Location displayed is the latest transmitted by the pendant. EverMind is a supportive routine companion, not a medical or emergency-response service.
        </p>
      </div>
    </div>
  );
}
