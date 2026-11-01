import { useState } from "react";
import { 
  AlertOctagon, 
  AlertTriangle, 
  Navigation, 
  MapPin, 
  CheckCircle2, 
  Check, 
  MessageSquare,
  ShieldCheck
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { saveAlertState } from "../../services/dataService";
import { timeAgo } from "../../services/deviceService";
import { Badge, Card, PageHeader } from "../../components/ui";
import type { Alert } from "../../types";

const KIND_META = {
  sos: { 
    icon: <AlertOctagon className="w-5 h-5 text-rose-600" />, 
    label: "Emergency SOS Alert", 
    tone: "red" as const 
  },
  possible_fall: { 
    icon: <AlertTriangle className="w-5 h-5 text-amber-600" />, 
    label: "Possible Fall (Experimental)", 
    tone: "amber" as const 
  },
  home: { 
    icon: <Navigation className="w-5 h-5 text-slate-700" />, 
    label: '"Take me home" Request', 
    tone: "blue" as const 
  },
};

function AlertCard({ alert }: { alert: Alert }) {
  const [note, setNote] = useState("");
  const meta = KIND_META[alert.kind];
  const { state, event } = alert;

  const update = (patch: Partial<typeof state>) =>
    saveAlertState({ ...state, ...patch, updatedAt: Date.now() });

  const addNote = () => {
    if (!note.trim()) return;
    update({ notes: [...state.notes, { text: note.trim(), at: Date.now() }] });
    setNote("");
  };

  const statusBadge = alert.cancelledByOk ? (
    <Badge tone="green">Cancelled by Wearer ("I'm OK")</Badge>
  ) : state.status === "new" ? (
    <Badge tone="red">Unresolved</Badge>
  ) : state.status === "acknowledged" ? (
    <Badge tone="amber">Acknowledged</Badge>
  ) : (
    <Badge tone="green">Resolved</Badge>
  );

  return (
    <Card className={alert.cancelledByOk || state.status === "resolved" ? "opacity-75" : ""}>
      <div className="flex items-start gap-3.5">
        <div className="p-2 rounded-xl bg-slate-100 shrink-0 mt-0.5">
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-semibold text-slate-900 text-sm">{meta.label}</p>
            {statusBadge}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {timeAgo(event.createdAt)}
          </p>
          {event.hasFix && event.lat != null ? (
            <p className="text-xs text-slate-600 mt-1 flex items-center gap-1 font-mono">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Location: {event.lat.toFixed(5)}, {event.lon!.toFixed(5)}</span>
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span>Location unavailable at trigger</span>
            </p>
          )}
          {event.experimental && (
            <p className="text-[11px] text-amber-700 mt-1.5 bg-amber-50 rounded-lg p-2 border border-amber-200/60 leading-relaxed">
              Fall detection is experimental sensor telemetry and requires human confirmation.
            </p>
          )}

          {state.notes.length > 0 && (
            <div className="mt-2.5 space-y-1.5">
              {state.notes.map((n, i) => (
                <div key={i} className="text-xs bg-slate-50 border border-slate-200/60 rounded-lg px-2.5 py-1.5 text-slate-700 flex items-start gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span className="flex-1">{n.text}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(n.at)}</span>
                </div>
              ))}
            </div>
          )}

          {!alert.cancelledByOk && state.status !== "resolved" && (
            <div className="mt-3.5 space-y-2 pt-2 border-t border-slate-100">
              <div className="flex gap-2">
                {state.status === "new" && (
                  <button
                    onClick={() => update({ status: "acknowledged", acknowledgedAt: Date.now() })}
                    className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 text-xs font-semibold transition cursor-pointer"
                  >
                    Acknowledge
                  </button>
                )}
                <button
                  onClick={() => update({ status: "resolved", resolvedAt: Date.now() })}
                  className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark Resolved</span>
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addNote()}
                  placeholder="Add care note…"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
                />
                <button
                  onClick={addNote}
                  className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function Alerts() {
  const { device } = useApp();
  const alerts = device?.alerts ?? [];
  const open = alerts.filter((a) => a.state.status !== "resolved" && !a.cancelledByOk);
  const closed = alerts.filter((a) => a.state.status === "resolved" || a.cancelledByOk);

  return (
    <div className="pb-28 min-h-dvh bg-slate-50">
      <PageHeader
        title="Safety Alerts"
        subtitle="Live emergency SOS, fall detection, and navigation requests"
      />
      <div className="px-5 space-y-3.5 max-w-md mx-auto">
        {alerts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-2">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <p className="font-semibold text-slate-800 text-sm">All Quiet &amp; Safe</p>
            <p className="text-xs text-slate-400 mt-1">No emergency alerts registered.</p>
          </div>
        )}
        {open.map((a) => (
          <AlertCard key={a.event.id} alert={a} />
        ))}
        {closed.length > 0 && (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pt-3 px-1">
              Resolved &amp; Closed
            </p>
            {closed.map((a) => (
              <AlertCard key={a.event.id} alert={a} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
