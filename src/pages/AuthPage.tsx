import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, User, Users, Eye, EyeOff } from "lucide-react";
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

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-none transition";

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-sm w-full mx-auto pt-6 pb-4">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 text-white mb-3 shadow-sm">
            <ShieldCheck className="w-6 h-6 stroke-[1.75]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">EverMind</h1>
          <p className="text-xs text-slate-500 font-medium tracking-wide mt-1">
            Remember. Stay Safe. Stay Connected.
          </p>
          <div className="mt-2.5 flex justify-center">
            <DemoBadge />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          {/* Segmented Mode tabs */}
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 mb-6 text-xs font-semibold">
            {(["login", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={`rounded-lg py-2 transition-all cursor-pointer ${
                  mode === m
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {/* Role selection pills */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                I am using EverMind as
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("patient")}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition cursor-pointer ${
                    role === "patient"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Wearer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("caregiver")}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition cursor-pointer ${
                    role === "caregiver"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Caregiver</span>
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Full name
                </label>
                <input
                  className={inputClass}
                  placeholder={role === "patient" ? "e.g. Ramesh Sharma" : "e.g. Asha Sharma"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Email
              </label>
              <input
                className={inputClass}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  className={`${inputClass} pr-10`}
                  type={showPw ? "text" : "password"}
                  placeholder={mode === "signup" ? "At least 6 characters" : "Enter password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Confirm password
                </label>
                <input
                  className={inputClass}
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
              <div className="rounded-xl bg-rose-50 border border-rose-200/80 p-3 text-xs text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white py-3 text-sm font-semibold tracking-tight transition shadow-sm active:scale-[0.99] cursor-pointer mt-2"
            >
              {busy ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            {mode === "login" ? "New to EverMind? " : "Already registered? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
              }}
              className="font-semibold text-slate-900 hover:underline cursor-pointer"
            >
              {mode === "login" ? "Create an account" : "Sign in here"}
            </button>
          </p>
        </div>
      </div>

      {/* Subtle Disclaimer Footer */}
      <footer className="text-center text-[11px] text-slate-400 max-w-sm mx-auto pb-4 leading-relaxed">
        EverMind is a supportive routine &amp; safety companion. It is{" "}
        <span className="font-medium text-slate-500">not a medical device</span> and does not diagnose, treat, or cure medical conditions.
      </footer>
    </div>
  );
}
