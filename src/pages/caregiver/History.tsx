import { 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle2, 
  Navigation, 
  MapPin, 
  Clock 
} from "lucide-react";
import type { ReactNode } from "react";
import { useApp } from "../../context/AppContext";
import { timeAgo } from "../../services/deviceService";
import { Badge, PageHeader } from "../../components/ui";
import type { DeviceEventType } from "../../types";

const META: Record<DeviceEventType, { icon: ReactNode; label: string; tone: "red" | "amber" | "green" | "blue" | "slate" }> = {
  sos: { 
    icon: <AlertOctagon className="w-4 h-4 text-rose-600" />, 
    label: "SOS Emergency Triggered", 
    tone: "red" 
  },
  possible_fall: { 
    icon: <AlertTriangle className="w-4 h-4 text-amber-600" />, 
    label: "Possible Fall (Experimental)", 
    tone: "amber" 
  },
  ok: { 
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />, 
    label: 'Wearer Pressed "I\'m OK"', 
    tone: "green" 
  },
  home: { 
    icon: <Navigation className="w-4 h-4 text-slate-700" />, 
    label: '"Take me home" Requested', 
    tone: "blue" 
  },
  location: { 
    icon: <MapPin className="w-4 h-4 text-slate-500" />, 
    label: "Location Telemetry Update", 
    tone: "slate" 
  },
};

export default function History() {
  const { device } = useApp();
  const events = device?.events ?? [];

  return (
    <div className="pb-28 min-h-dvh bg-slate-50">
      <PageHeader title="Event History" subtitle="Chronological timeline of device telemetry & alerts" />
      <div className="px-5 max-w-md mx-auto">
        {events.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-800 text-sm">No Events Logged</p>
            <p className="text-xs text-slate-400 mt-1">Incoming sensor telemetry will appear here.</p>
          </div>
        )}
        <div className="relative pl-5 border-l-2 border-slate-200/80 space-y-3.5 my-2">
          {events.map((e) => {
            const m = META[e.type];
            return (
              <div key={e.id} className="relative">
                <span className="absolute -left-[27px] top-3.5 h-3 w-3 rounded-full bg-white border-2 border-slate-900 shadow-sm" />
                <div className="rounded-2xl bg-white border border-slate-200/80 p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {m.icon}
                      <p className="text-xs font-semibold text-slate-900">
                        {m.label}
                      </p>
                    </div>
                    <Badge tone={m.tone}>{timeAgo(e.createdAt)}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between flex-wrap gap-1">
                    <span>{new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    {e.hasFix && e.lat != null ? (
                      <span className="font-mono text-slate-400">
                        {e.lat.toFixed(5)}, {e.lon!.toFixed(5)}
                      </span>
                    ) : (
                      <span className="text-slate-400">Recorded</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
