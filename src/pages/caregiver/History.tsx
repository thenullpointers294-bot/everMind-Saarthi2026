import { useApp } from "../../context/AppContext";
import { timeAgo } from "../../services/deviceService";
import { Badge, PageHeader } from "../../components/ui";
import type { DeviceEventType } from "../../types";

const META: Record<DeviceEventType, { icon: string; label: string; tone: "red" | "amber" | "green" | "blue" | "slate" }> = {
  sos: { icon: "🆘", label: "SOS pressed", tone: "red" },
  possible_fall: { icon: "⚠️", label: "Possible fall (experimental)", tone: "amber" },
  ok: { icon: "✅", label: 'Wearer pressed "I\'m OK"', tone: "green" },
  home: { icon: "🏠", label: '"Take me home" request', tone: "blue" },
  location: { icon: "📍", label: "Location update", tone: "slate" },
};

export default function History() {
  const { device } = useApp();
  const events = device?.events ?? [];

  return (
    <div className="pb-28 min-h-dvh bg-slate-50">
      <PageHeader title="History" subtitle="Latest 50 pendant events (read-only)" />
      <div className="px-4 max-w-md mx-auto">
        {events.length === 0 && (
          <p className="text-center text-slate-500 py-10">No events yet.</p>
        )}
        <div className="relative pl-5 border-l-2 border-slate-200 space-y-3">
          {events.map((e) => {
            const m = META[e.type];
            return (
              <div key={e.id} className="relative">
                <span className="absolute -left-[27px] top-2 h-3 w-3 rounded-full bg-white border-2 border-teal-500" />
                <div className="rounded-xl bg-white border border-slate-200 p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-700">
                      {m.icon} {m.label}
                    </p>
                    <Badge tone={m.tone}>{timeAgo(e.createdAt)}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(e.createdAt).toLocaleString()}
                    {e.hasFix && e.lat != null
                      ? ` · 📍 ${e.lat.toFixed(5)}, ${e.lon!.toFixed(5)}`
                      : " · no GPS fix"}
                    {e.fixAgeMs != null && ` · fix age ${(e.fixAgeMs / 1000).toFixed(1)}s`}
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
