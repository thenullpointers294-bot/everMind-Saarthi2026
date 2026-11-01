import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { 
  MapPin, 
  Navigation, 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle2, 
  Footprints,
  Code2,
  Crosshair
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { simulator, timeAgo } from "../../services/deviceService";
import { broadcastDeviceLocation } from "../../services/geoService";
import { Card, PageHeader, Badge } from "../../components/ui";
import { isDemo } from "../../services/dataService";

const ACTIONS: {
  key: keyof typeof simulator;
  icon: ReactNode;
  label: string;
  desc: string;
  cls: string;
}[] = [
  { key: "sendLocation", icon: <MapPin className="w-4 h-4 text-slate-300" />, label: "Send Sim Location", desc: 'type:"location", sim position', cls: "bg-slate-900 hover:bg-slate-800" },
  { key: "moveLocation", icon: <Footprints className="w-4 h-4 text-slate-300" />, label: "Simulate Walk", desc: "Random walk near Dehradun", cls: "bg-slate-900 hover:bg-slate-800" },
  { key: "pressSOS", icon: <AlertOctagon className="w-4 h-4 text-rose-200" />, label: "Trigger SOS", desc: 'type:"sos" — creates New alert', cls: "bg-rose-600 hover:bg-rose-700" },
  { key: "triggerFall", icon: <AlertTriangle className="w-4 h-4 text-amber-200" />, label: "Trigger Fall", desc: 'type:"possible_fall", experimental', cls: "bg-amber-600 hover:bg-amber-700" },
  { key: "pressOk", icon: <CheckCircle2 className="w-4 h-4 text-emerald-200" />, label: "Press I'm OK", desc: 'type:"ok" — cancels fall alert', cls: "bg-emerald-600 hover:bg-emerald-700" },
  { key: "pressHome", icon: <Navigation className="w-4 h-4 text-slate-300" />, label: "Take Me Home", desc: 'type:"home" — route request', cls: "bg-slate-900 hover:bg-slate-800" },
];

export default function Simulator() {
  const { settings, device } = useApp();
  const [log, setLog] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);

  const run = async (key: keyof typeof simulator, label: string) => {
    await simulator[key](settings.deviceId);
    setLog((l) => [`${new Date().toLocaleTimeString()} — ${label}`, ...l].slice(0, 8));
  };

  const broadcastLiveGPS = async () => {
    setLocating(true);
    try {
      const coords = await broadcastDeviceLocation(settings.deviceId, "location");
      setLog((l) => [`${new Date().toLocaleTimeString()} — 📍 Real GPS: ${coords.lat}, ${coords.lon} (±${coords.accuracy ?? 0}m)`, ...l].slice(0, 8));
    } catch (err) {
      setLog((l) => [`${new Date().toLocaleTimeString()} — ⚠️ Location error: ${err instanceof Error ? err.message : "Denied"}`, ...l].slice(0, 8));
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="pb-28 min-h-dvh bg-slate-50">
      <PageHeader
        title="Hardware Simulator"
        subtitle={`Writes event documents to ${isDemo ? "local demo store" : `devices/${settings.deviceId}/events`}`}
        right={
          <Link to="/dev/api" className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5 transition">
            <Code2 className="w-3.5 h-3.5" />
            <span>API Spec</span>
          </Link>
        }
      />
      <div className="px-5 space-y-4 max-w-md mx-auto">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-900">Device ID: <span className="font-mono">{settings.deviceId}</span></p>
            <Badge tone={device?.status.online ? "green" : "slate"}>
              {device?.status.online
                ? "Online"
                : `Offline · last seen ${timeAgo(device?.status.lastSeen ?? null)}`}
            </Badge>
          </div>
        </Card>

        {/* Real Device Location Trigger */}
        <button
          onClick={broadcastLiveGPS}
          disabled={locating}
          className="w-full rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white p-3.5 shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center justify-between gap-3 disabled:opacity-50"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <Crosshair className={`w-4 h-4 ${locating ? "animate-spin" : ""}`} />
            </div>
            <div className="text-left">
              <p className="font-bold text-xs">Use Real Device GPS (Phone / Laptop)</p>
              <p className="text-[10px] text-white/80">Broadcast your exact current location to Firebase</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold bg-white/20 px-2.5 py-1 rounded-lg">
            {locating ? "Locating..." : "Sync GPS"}
          </span>
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          {ACTIONS.map((a) => (
            <button
              key={a.key}
              onClick={() => run(a.key, a.label)}
              className={`${a.cls} text-white rounded-2xl p-3.5 text-left shadow-sm active:scale-[0.98] transition-all cursor-pointer`}
            >
              <div className="mb-2">{a.icon}</div>
              <div className="font-bold text-xs">{a.label}</div>
              <div className="text-[10px] text-white/75 mt-0.5 leading-snug line-clamp-1">{a.desc}</div>
            </button>
          ))}
        </div>

        {log.length > 0 && (
          <Card>
            <h2 className="font-semibold text-slate-900 text-xs mb-2">Simulated Event Stream</h2>
            <div className="space-y-1">
              {log.map((l, i) => (
                <p key={i} className="text-xs text-slate-500 font-mono bg-slate-50 p-1.5 rounded-lg border border-slate-100">{l}</p>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
