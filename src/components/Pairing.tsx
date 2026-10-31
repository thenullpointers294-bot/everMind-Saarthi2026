import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useApp } from "../context/AppContext";
import { linkToPatient, unlinkPatient } from "../services/authService";
import { Card, Badge } from "./ui";

/** Shown on the PATIENT side — their unique code for caretakers to enter. */
export function PatientCodeCard({ compact = false }: { compact?: boolean }) {
  const { session } = useApp();
  const [copied, setCopied] = useState(false);
  const code = session?.pairCode;
  if (!code) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const share = async () => {
    const text = `My Memory Guardian code is ${code}. Enter it in the caretaker app to connect with me.`;
    if (navigator.share) {
      await navigator.share({ title: "Memory Guardian code", text }).catch(() => {});
    } else {
      copy();
    }
  };

  return (
    <Card className="border-teal-200 bg-gradient-to-br from-white to-teal-50">
      <p className="text-xs font-bold uppercase tracking-wide text-teal-600">
        🔗 My connection code
      </p>
      <p className="text-sm text-slate-500 mt-0.5">
        Give this code to your family so their app can connect to yours.
      </p>
      <div className="mt-3 flex items-center gap-4">
        <div className="flex-1">
          <div className="rounded-2xl bg-slate-900 text-white text-center py-3 px-2 font-mono text-2xl font-extrabold tracking-[0.2em] select-all">
            {code}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={copy}
              className="flex-1 rounded-xl bg-teal-600 text-white py-2 text-sm font-bold"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
            <button
              onClick={share}
              className="flex-1 rounded-xl bg-white border border-teal-300 text-teal-700 py-2 text-sm font-bold"
            >
              Share
            </button>
          </div>
        </div>
        {!compact && (
          <div className="rounded-xl bg-white border border-slate-200 p-1.5">
            <QRCodeSVG value={code} size={88} />
          </div>
        )}
      </div>
    </Card>
  );
}

/** Shown on the CAREGIVER side — enter a patient's code to connect. */
export function LinkPatientCard() {
  const { session } = useApp();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const p = await linkToPatient(code);
      setMsg({ ok: true, text: `Connected to ${p.patientName} ✓` });
      setCode("");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not connect." });
    } finally {
      setBusy(false);
    }
  };

  if (session?.linkedCode) {
    return (
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-bold text-slate-800">🔗 Connected patient</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Code <Badge tone="blue">{session.linkedCode}</Badge>
            </p>
          </div>
          <button
            onClick={() => unlinkPatient()}
            className="rounded-xl bg-slate-100 text-slate-600 px-3 py-2 text-xs font-bold"
          >
            Disconnect
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-sky-200 bg-gradient-to-br from-white to-sky-50">
      <p className="font-bold text-slate-800">🔗 Connect to a patient</p>
      <p className="text-sm text-slate-500 mt-0.5">
        Ask the patient for the code shown in their app (Family tab), then enter it here.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && connect()}
          placeholder="MG-XXXXXX"
          maxLength={9}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-mono text-lg font-bold tracking-widest uppercase outline-none focus:border-sky-500"
        />
        <button
          onClick={connect}
          disabled={busy || code.replace(/[^A-Z0-9]/g, "").length < 6}
          className="rounded-xl bg-sky-600 disabled:opacity-50 text-white px-5 font-bold"
        >
          {busy ? "…" : "Connect"}
        </button>
      </div>
      {msg && (
        <p className={`mt-2 text-sm font-semibold ${msg.ok ? "text-emerald-700" : "text-rose-600"}`}>
          {msg.text}
        </p>
      )}
    </Card>
  );
}
