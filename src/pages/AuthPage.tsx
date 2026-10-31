import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { signIn, signUp, type AccountRole } from "../services/authService";
import { DemoBadge } from "../components/ui";

type Mode = "login" | "signup";

export default function AuthPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "login");
  const [role, setRole] = useState<AccountRole>("patient");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "signup" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const profile =
        mode === "signup"
          ? await signUp({ email, password, name, role })
          : await signIn({ email, password, role });
      nav(profile.role === "patient" ? "/wearer" : "/caregiver", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message.replace("Firebase: ", "") : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition";

  return (
    <div className="min-h-dvh bg-gradient-to-b from-teal-600 via-teal-500 to-emerald-500 flex flex-col">
      {/* Brand */}
      <div className="px-6 pt-12 pb-8 text-center text-white">
        <div className="text-5xl">🛡️</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Memory Guardian</h1>
        <p className="text-teal-50 font-medium">Remember. Stay Safe. Stay Connected.</p>
        <div className="mt-2 flex justify-center"><DemoBadge /></div>
      </div>

      {/* Card */}
      <div className="flex-1 bg-slate-50 rounded-t-[2rem] px-5 pt-6 pb-10 shadow-2xl">
        <div className="max-w-sm mx-auto">
          {/* Mode tabs */}
          <div className="grid grid-cols-2 rounded-2xl bg-slate-200 p-1 mb-6">
            {(["login", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={`rounded-xl py-2.5 text-sm font-bold transition-all ${
                  mode === m ? "bg-white text-teal-700 shadow" : "text-slate-500"
                }`}
              >
                {m === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          <h2 className="text-xl font-bold text-slate-900">
            {mode === "login" ? "Welcome back 👋" : "Create your account"}
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            {mode === "login"
              ? "Log in to continue to your dashboard."
              : "Patients receive a unique code that caretakers use to connect."}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {/* Role dropdown */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                I am a
              </label>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as AccountRole)}
                  className={`${input} appearance-none pr-10 font-semibold`}
                >
                  <option value="patient">🧓 Patient (wears the pendant)</option>
                  <option value="caregiver">🤝 Caretaker (family / caregiver)</option>
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  ▾
                </span>
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                  Full name
                </label>
                <input
                  className={input}
                  placeholder={role === "patient" ? "e.g. Ramesh Sharma" : "e.g. Asha Sharma"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                Email
              </label>
              <input
                className={input}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  className={`${input} pr-16`}
                  type={showPw ? "text" : "password"}
                  placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-teal-700"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                  Confirm password
                </label>
                <input
                  className={input}
                  type={showPw ? "text" : "password"}
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white py-3.5 text-base font-bold shadow-lg shadow-teal-200 active:scale-[0.98] transition"
            >
              {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            {mode === "login" ? "New to Memory Guardian? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
              }}
              className="font-bold text-teal-700"
            >
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </p>

          <p className="mt-8 text-center text-[11px] text-slate-400 leading-relaxed">
            Memory Guardian is a supportive safety &amp; routine companion. It is{" "}
            <b>not a medical device</b> and does not diagnose, prevent, treat or cure any condition.
          </p>
        </div>
      </div>
    </div>
  );
}
