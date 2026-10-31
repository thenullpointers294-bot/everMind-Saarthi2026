import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
            ? "Running in demo mode (no Firebase config)"
            : `Connected to Firebase ${backend === "rtdb" ? "Realtime Database" : "Firestore"} · project ${import.meta.env.VITE_FIREBASE_PROJECT_ID ?? ""}`
        }
      />
      <div className="px-4 space-y-4 max-w-md mx-auto">
        {/* Account */}
        <Card>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-teal-600 text-white flex items-center justify-center text-xl font-bold">
              {session?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-800">{session?.name}</p>
              <p className="text-xs text-slate-500">{session?.email}</p>
            </div>
            <Badge tone={session?.role === "patient" ? "green" : "blue"}>
              {session?.role === "patient" ? "🧓 Patient" : "🤝 Caretaker"}
            </Badge>
          </div>
          <button
            onClick={logout}
            className="mt-4 w-full rounded-xl bg-rose-50 text-rose-600 py-2.5 text-sm font-bold border border-rose-200"
          >
            Log out
          </button>
        </Card>

        {/* Pairing */}
        {session?.role === "patient" ? <PatientCodeCard /> : <LinkPatientCard />}

        {session?.role === "caregiver" && (
          <Card>
            <h2 className="font-bold text-slate-800 mb-3">Patient display name</h2>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                onClick={() => updateSettings({ wearerName: name })}
                className="rounded-xl bg-teal-600 text-white px-4 text-sm font-bold"
              >
                Save
              </button>
            </div>
          </Card>
        )}

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800">Developer mode</h2>
              <p className="text-xs text-slate-500">Pendant simulator &amp; API contract</p>
            </div>
            <button
              onClick={() => updateSettings({ developerMode: !settings.developerMode })}
              className={`h-7 w-12 rounded-full transition-colors relative ${
                settings.developerMode ? "bg-teal-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  settings.developerMode ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
          {settings.developerMode && (
            <div className="mt-3 flex gap-2">
              <Link
                to="/dev/simulator"
                className="flex-1 rounded-xl bg-slate-800 text-white py-2 text-sm font-bold text-center"
              >
                🛠 Simulator
              </Link>
              <Link
                to="/dev/api"
                className="flex-1 rounded-xl bg-slate-200 text-slate-700 py-2 text-sm font-bold text-center"
              >
                📄 API contract
              </Link>
            </div>
          )}
        </Card>

        <p className="text-center text-[11px] text-slate-400 leading-relaxed pb-4">
          Memory Guardian · Remember. Stay Safe. Stay Connected.
          <br />
          A supportive safety &amp; routine companion — <b>not a medical device</b>. It never
          diagnoses, prevents, treats or cures any condition.
        </p>
      </div>
    </div>
  );
}
