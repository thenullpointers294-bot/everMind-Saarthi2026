import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertOctagon, AlertTriangle, ArrowRight, X, Volume2 } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function EmergencyAlertOverlay() {
  const { device, session, settings } = useApp();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  if (session?.role !== "caregiver" || !device?.alerts) return null;

  // Find active, unresolved alert that hasn't been dismissed in this view
  const activeAlert = device.alerts.find(
    (a) =>
      a.state.status !== "resolved" &&
      !a.cancelledByOk &&
      !dismissedIds.has(a.event.id)
  );

  if (!activeAlert) return null;

  const isSOS = activeAlert.kind === "sos";

  return (
    <div className="fixed top-4 inset-x-4 z-[9999] max-w-md mx-auto animate-bounce-short">
      <div className={`rounded-2xl p-4 shadow-2xl border ${
        isSOS 
          ? "bg-rose-600 border-rose-500 text-white" 
          : "bg-amber-500 border-amber-400 text-slate-900"
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-white/20 text-white shrink-0 mt-0.5 animate-pulse">
              {isSOS ? <AlertOctagon className="w-6 h-6 stroke-[2.5]" /> : <AlertTriangle className="w-6 h-6 stroke-[2.5]" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                  {isSOS ? "EMERGENCY SOS" : "FALL DETECTED"}
                </span>
                <Volume2 className="w-3.5 h-3.5 animate-pulse opacity-80" />
              </div>
              <p className="font-bold text-base mt-1 leading-snug">
                {settings.wearerName} needs immediate attention!
              </p>
              <p className={`text-xs mt-0.5 ${isSOS ? "text-rose-100" : "text-amber-950/80"}`}>
                {isSOS ? "Pendant emergency button pressed" : "High-impact fall recorded"}
                {activeAlert.event.lat && activeAlert.event.lon ? ` · Location attached` : ""}
              </p>
            </div>
          </div>

          <button
            onClick={() => setDismissedIds(prev => new Set([...prev, activeAlert.event.id]))}
            className="p-1 rounded-lg hover:bg-black/10 transition cursor-pointer shrink-0 opacity-80 hover:opacity-100"
            title="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between gap-2">
          <span className="text-[11px] opacity-80 font-medium">Take immediate action</span>
          <Link
            to="/caregiver/alerts"
            className="inline-flex items-center gap-1.5 bg-white text-slate-900 font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-sm hover:bg-slate-100 transition no-underline cursor-pointer"
          >
            <span>Open Alert Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
