import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { saveAlertState } from "../../services/dataService";
import { timeAgo } from "../../services/deviceService";
import { Badge, Card, PageHeader } from "../../components/ui";
import type { Alert } from "../../types";

const KIND_META = {
  sos: { icon: "🆘", label: "SOS — help requested", tone: "red" as const },
  possible_fall: { icon: "⚠️", label: "Possible fall (experimental)", tone: "amber" as const },
  home: { icon: "🏠", label: '"Take me home" request', tone: "blue" as const },
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
    <Badge tone="green">Cancelled — wearer pressed I'm OK</Badge>
  ) : state.status === "new" ? (
    <Badge tone="red">New</Badge>
  ) : state.status === "acknowledged" ? (
    <Badge tone="amber">Acknowledged</Badge>
  ) : (
    <Badge tone="green">Resolved</Badge>
  );

  return (
    <Card className={alert.cancelledByOk || state.status === "resolved" ? "opacity-70" : ""}>
      <div className="flex items-start gap-3">
        <div className="text-2xl">{meta.icon}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-slate-800">{meta.label}</p>
            {statusBadge}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date(event.createdAt).toLocaleString()} · {timeAgo(event.createdAt)}
          </p>
          {event.hasFix && event.lat != null ? (
            <p className="text-xs text-slate-500">
              📍 Latest available location: {event.lat.toFixed(5)}, {event.lon!.toFixed(5)}
            </p>
          ) : (
            <p className="text-xs text-slate-400">📍 No GPS fix at the time of the alert</p>
          )}
          {event.experimental && (
            <p className="text-[11px] text-amber-700 mt-1">
              Fall detection is experimental and may be wrong — always check on the person.
            </p>
          )}

          {state.notes.length > 0 && (
            <div className="mt-2 space-y-1">
              {state.notes.map((n, i) => (
                <p key={i} className="text-xs bg-slate-50 rounded-lg px-2 py-1.5 text-slate-600">
                  📝 {n.text}{" "}
                  <span className="text-slate-400">· {timeAgo(n.at)}</span>
                </p>
              ))}
            </div>
          )}

          {!alert.cancelledByOk && state.status !== "resolved" && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                {state.status === "new" && (
                  <button
                    onClick={() => update({ status: "acknowledged", acknowledgedAt: Date.now() })}
                    className="flex-1 rounded-xl bg-amber-500 text-white py-2 text-sm font-bold"
                  >
                    Acknowledge
                  </button>
                )}
                <button
                  onClick={() => update({ status: "resolved", resolvedAt: Date.now() })}
                  className="flex-1 rounded-xl bg-emerald-600 text-white py-2 text-sm font-bold"
                >
                  Resolve ✓
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addNote()}
                  placeholder="Add a note…"
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  onClick={addNote}
                  className="rounded-xl bg-slate-800 text-white px-4 text-sm font-bold"
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
        title="Alerts"
        subtitle="Caregiver actions are stored separately — device events stay read-only"
      />
      <div className="px-4 space-y-3 max-w-md mx-auto">
        {alerts.length === 0 && (
          <p className="text-center text-slate-500 py-10">No alerts — all calm 😊</p>
        )}
        {open.map((a) => (
          <AlertCard key={a.event.id} alert={a} />
        ))}
        {closed.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 pt-3 px-1">
              Resolved / cancelled
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
