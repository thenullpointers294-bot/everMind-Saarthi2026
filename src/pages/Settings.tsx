import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Sliders, Code2, Save } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Card, PageHeader, Badge } from "../components/ui";
import { isDemo, backend } from "../services/dataService";
import { signOut } from "../services/authService";
import { PatientCodeCard, LinkPatientCard } from "../components/Pairing";

export default function Settings() {
  const { settings, updateSettings, session } = useApp();
  const nav = useNavigate();
  const [name, setName] = useState(settings.wearerName);

  const logout = async () => {
    await signOut();
    nav("/auth", { replace: true });
  };

  return (
    <div className="pb-28 min-h-dvh bg-slate-50">
      <PageHeader
        title="Settings"
        subtitle={
          isDemo
            ? "Running in local demo mode"
            : `Connected to Cloud ${backend === "rtdb" ? "RTDB" : "Firestore"}`
        }
      />
      <div className="px-5 space-y-4 max-w-md mx-auto">
        {/* Account */}
        <Card>
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-full bg-slate-900 text-white flex items-center justify-center text-base font-bold">
              {session?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm truncate">{session?.name}</p>
              <p className="text-xs text-slate-500 truncate">{session?.email}</p>
            </div>
            <Badge tone={session?.role === "patient" ? "green" : "blue"}>
              {session?.role === "patient" ? "Wearer" : "Caregiver"}
            </Badge>
          </div>
          <button
            onClick={logout}
            className="mt-4 w-full rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 py-2.5 text-xs font-semibold border border-slate-200 hover:border-rose-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </Card>

        {/* Pairing */}
        {session?.role === "patient" ? <PatientCodeCard /> : <LinkPatientCard />}

        {session?.role === "caregiver" && (
          <Card>
            <h2 className="font-semibold text-slate-900 text-sm mb-2.5">Wearer Display Name</h2>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
              />
              <button
                onClick={() => updateSettings({ wearerName: name })}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </Card>
        )}

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Developer Tools</h2>
              <p className="text-xs text-slate-500 mt-0.5">Pendant simulator &amp; API contract</p>
            </div>
            <button
              onClick={() => updateSettings({ developerMode: !settings.developerMode })}
              className={`h-6 w-11 rounded-full transition-colors relative cursor-pointer ${
                settings.developerMode ? "bg-slate-900" : "bg-slate-200"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                  settings.developerMode ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </div>
          {settings.developerMode && (
            <div className="mt-3.5 flex gap-2 pt-2 border-t border-slate-100">
              <Link
                to="/dev/simulator"
                className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2 text-xs font-semibold text-center transition flex items-center justify-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Simulator</span>
              </Link>
              <Link
                to="/dev/api"
                className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 text-xs font-semibold text-center transition flex items-center justify-center gap-1.5"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>API Spec</span>
              </Link>
            </div>
          )}
        </Card>

        <p className="text-center text-[11px] text-slate-400 leading-relaxed pb-4">
          EverMind · Remember. Stay Safe. Stay Connected.
          <br />
          A supportive safety &amp; routine companion — <span className="font-medium text-slate-500">not a medical device</span>. It does not diagnose, treat, or cure medical conditions.
        </p>
      </div>
    </div>
  );
}
