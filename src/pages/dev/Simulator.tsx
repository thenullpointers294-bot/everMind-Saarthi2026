import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { simulator, timeAgo } from "../../services/deviceService";
import { Card, PageHeader, Badge } from "../../components/ui";
import { isDemo } from "../../services/dataService";

const ACTIONS: {
  key: keyof typeof simulator;
  icon: string;
  label: string;
  desc: string;
  cls: string;
}[] = [
  { key: "sendLocation", icon: "📍", label: "Send location", desc: 'type:"location", current sim position', cls: "bg-slate-800" },
  { key: "moveLocation", icon: "🚶", label: "Move location", desc: "random walk near Dehradun (30.3165, 78.0322)", cls: "bg-slate-800" },
  { key: "pressSOS", icon: "🆘", label: "Press SOS", desc: 'type:"sos" — creates a New alert', cls: "bg-rose-600" },
  { key: "triggerFall", icon: "⚠️", label: "Trigger possible fall", desc: 'type:"possible_fall", experimental:true', cls: "bg-amber-600" },
  { key: "pressOk", icon: "✅", label: "Press I'm OK", desc: 'type:"ok" — cancels a pending fall alert', cls: "bg-emerald-600" },
  { key: "pressHome", icon: "🏠", label: "Press Home", desc: 'type:"home" — take-me-home request', cls: "bg-sky-600" },
];

export default function Simulator() {
  const { settings, device } = useApp();
  const [log, setLog] = useState<string[]>([]);

  const run = async (key: keyof typeof simulator, label: string) => {
    await simulator[key](settings.deviceId);
    setLog((l) => [`${new Date().toLocaleTimeString()} — ${label}`, ...l].slice(0, 8));
  };

  return (
    <div className="pb-28 min-h-dvh bg-slate-50">
      <PageHeader
        title="Pendant Simulator"
        subtitle={`Writes real event documents to ${isDemo ? "local demo store" : `devices/${settings.deviceId}/events`}`}
        right={
          <Link to="/dev/api" className="rounded-xl bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2">
            📄 API contract
          </Link>
        }
      />
      <div className="px-4 space-y-4 max-w-md mx-auto">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700">Device: {settings.deviceId}</p>
            <Badge tone={device?.status.online ? "green" : "slate"}>
              {device?.status.online
                ? "Online"
                : `Offline / last seen ${timeAgo(device?.status.lastSeen ?? null)}`}
            </Badge>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          {ACTIONS.map((a) => (
            <button
              key={a.key}
              onClick={() => run(a.key, a.label)}
              className={`${a.cls} text-white rounded-2xl p-4 text-left shadow-md active:scale-[0.97] transition-transform`}
            >
              <div className="text-2xl">{a.icon}</div>
              <div className="font-bold mt-1 text-sm">{a.label}</div>
              <div className="text-[10px] opacity-75 mt-0.5 leading-tight">{a.desc}</div>
            </button>
          ))}
        </div>

        {log.length > 0 && (
          <Card>
            <h2 className="font-bold text-slate-800 text-sm mb-2">Sent events</h2>
            <div className="space-y-1">
              {log.map((l, i) => (
                <p key={i} className="text-xs text-slate-500 font-mono">{l}</p>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
