import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Link2, Copy, Check, Share2, Unlink } from "lucide-react";
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
    const text = `My EverMind connection code is ${code}. Enter it in your caregiver app to connect with me.`;
    if (navigator.share) {
      await navigator.share({ title: "EverMind Pair Code", text }).catch(() => {});
    } else {
      copy();
    }
  };

  return (
    <Card className="border-slate-200/80 bg-white">
      <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
        <Link2 className="w-4 h-4 text-slate-700" />
        <span>Caregiver Connection Code</span>
      </div>
      <p className="text-xs text-slate-500 mt-1">
        Share this code with your family or caregiver so their app can link to your device.
      </p>
      <div className="mt-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="rounded-2xl bg-slate-900 text-white text-center py-3 px-2 font-mono text-2xl font-bold tracking-[0.2em] select-all shadow-sm">
            {code}
          </div>
          <div className="mt-2.5 flex gap-2">
            <button
              onClick={copy}
              className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            <button
              onClick={share}
              className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>
        {!compact && (
          <div className="rounded-2xl bg-white border border-slate-200/80 p-2 shadow-sm shrink-0">
            <QRCodeSVG value={code} size={84} />
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
      setMsg({ ok: true, text: `Successfully connected to ${p.patientName}` });
      setCode("");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not connect to patient." });
    } finally {
      setBusy(false);
    }
  };

  if (session?.linkedCode) {
    return (
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Linked Wearer</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Code <Badge tone="green">{session.linkedCode}</Badge>
              </p>
            </div>
          </div>
          <button
            onClick={() => unlinkPatient()}
            className="rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
          >
            <Unlink className="w-3.5 h-3.5" />
            <span>Unlink</span>
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/80 bg-white">
      <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
        <Link2 className="w-4 h-4 text-slate-700" />
        <span>Pair with a Wearer</span>
      </div>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
        Enter the 6-digit code displayed in the wearer's EverMind app (under the Family tab) or printed on their pendant device.
      </p>
      <div className="mt-3.5 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && connect()}
          placeholder="EM-XXXXXX"
          maxLength={9}
          className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-base font-semibold tracking-wider uppercase outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
        />
        <button
          onClick={connect}
          disabled={busy || code.replace(/[^A-Z0-9]/g, "").length < 6}
          className="rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white px-5 text-xs font-semibold tracking-tight transition cursor-pointer"
        >
          {busy ? "…" : "Connect"}
        </button>
      </div>
      {msg && (
        <p className={`mt-2.5 text-xs font-medium ${msg.ok ? "text-emerald-700" : "text-rose-600"}`}>
          {msg.text}
        </p>
      )}
    </Card>
  );
}
