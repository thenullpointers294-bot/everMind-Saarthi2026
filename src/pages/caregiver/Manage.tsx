import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { useApp } from "../../context/AppContext";
import {
  saveReminder,
  deleteReminder,
  saveContact,
  deleteContact,
} from "../../services/dataService";
import { Card, PageHeader, Badge } from "../../components/ui";
import { LinkPatientCard } from "../../components/Pairing";
import { setPairingDevice } from "../../services/authService";
import { formatTime12, REMINDER_ICONS } from "../../utils/reminderUtils";
import type { Contact, Reminder } from "../../types";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// ---------------- Reminders ----------------
function ReminderEditor({ initial, onClose }: { initial?: Reminder; onClose: () => void }) {
  const [r, setR] = useState<Reminder>(
    initial ?? { id: "r-" + Date.now(), title: "", time: "09:00", days: [], type: "medicine" }
  );
  return (
    <div className="rounded-2xl border-2 border-teal-200 bg-teal-50/50 p-4 space-y-3">
      <input
        value={r.title}
        onChange={(e) => setR({ ...r, title: e.target.value })}
        placeholder="Reminder title"
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
      />
      <div className="flex gap-2">
        <input
          type="time"
          value={r.time}
          onChange={(e) => setR({ ...r, time: e.target.value })}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
        />
        <select
          value={r.type}
          onChange={(e) => setR({ ...r, type: e.target.value as Reminder["type"] })}
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          {Object.keys(REMINDER_ICONS).map((t) => (
            <option key={t} value={t}>
              {REMINDER_ICONS[t as Reminder["type"]]} {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-1">Days (none selected = every day)</p>
        <div className="flex gap-1.5">
          {DAY_LABELS.map((d, i) => (
            <button
              key={i}
              onClick={() =>
                setR({
                  ...r,
                  days: r.days.includes(i) ? r.days.filter((x) => x !== i) : [...r.days, i],
                })
              }
              className={`h-8 w-8 rounded-full text-xs font-bold ${
                r.days.includes(i) ? "bg-teal-600 text-white" : "bg-white border border-slate-300 text-slate-500"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (r.title.trim()) {
              saveReminder(r);
              onClose();
            }
          }}
          className="flex-1 rounded-xl bg-teal-600 text-white py-2 text-sm font-bold"
        >
          Save
        </button>
        <button onClick={onClose} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold text-slate-600">
          Cancel
        </button>
      </div>
    </div>
  );
}

function RemindersSection() {
  const { reminders } = useApp();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-slate-800">⏰ Reminders</h2>
        <button
          onClick={() => setAdding(true)}
          className="rounded-lg bg-teal-600 text-white text-xs font-bold px-3 py-1.5"
        >
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {adding && <ReminderEditor onClose={() => setAdding(false)} />}
        {reminders.map((r) =>
          editing === r.id ? (
            <ReminderEditor key={r.id} initial={r} onClose={() => setEditing(null)} />
          ) : (
            <div key={r.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-lg">{REMINDER_ICONS[r.type]}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">{r.title}</p>
                <p className="text-xs text-slate-400">
                  {formatTime12(r.time)} ·{" "}
                  {r.days.length === 0 ? "every day" : r.days.map((d) => DAY_LABELS[d]).join(" ")}
                </p>
              </div>
              <button onClick={() => setEditing(r.id)} className="text-sm px-2">✏️</button>
              <button onClick={() => deleteReminder(r.id)} className="text-sm px-2">🗑️</button>
            </div>
          )
        )}
      </div>
    </Card>
  );
}

// ---------------- Contacts ----------------
function ContactsSection() {
  const { contacts } = useApp();
  const [editing, setEditing] = useState<Contact | null>(null);

  const Editor = ({ c }: { c: Contact }) => {
    const [v, setV] = useState(c);
    return (
      <div className="rounded-2xl border-2 border-teal-200 bg-teal-50/50 p-4 space-y-2">
        <input
          value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })}
          placeholder="Name"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
        />
        <input
          value={v.relation}
          onChange={(e) => setV({ ...v, relation: e.target.value })}
          placeholder="Relation (e.g. Daughter)"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
        />
        <input
          value={v.phone}
          onChange={(e) => setV({ ...v, phone: e.target.value })}
          placeholder="Phone"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={Boolean(v.isPrimary)}
            onChange={(e) => setV({ ...v, isPrimary: e.target.checked })}
          />
          Primary contact ⭐
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (v.name.trim()) {
                saveContact(v);
                setEditing(null);
              }
            }}
            className="flex-1 rounded-xl bg-teal-600 text-white py-2 text-sm font-bold"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(null)}
            className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold text-slate-600"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-slate-800">👪 Family contacts</h2>
        <button
          onClick={() =>
            setEditing({
              id: "c-" + Date.now(),
              name: "",
              relation: "",
              phone: "",
              color: ["#0d9488", "#7c3aed", "#2563eb", "#db2777"][Math.floor(Math.random() * 4)],
            })
          }
          className="rounded-lg bg-teal-600 text-white text-xs font-bold px-3 py-1.5"
        >
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {editing && <Editor c={editing} />}
        {contacts.map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <span
              className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: c.color }}
            >
              {c.name[0]}
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-700">
                {c.name} {c.isPrimary && "⭐"}
              </p>
              <p className="text-xs text-slate-400">{c.relation} · {c.phone}</p>
            </div>
            <button onClick={() => setEditing(c)} className="text-sm px-2">✏️</button>
            <button onClick={() => deleteContact(c.id)} className="text-sm px-2">🗑️</button>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------- Device pairing (QR) ----------------
function PairingSection() {
  const { settings, updateSettings, session } = useApp();
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const [manualId, setManualId] = useState(settings.deviceId);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Persist the pendant id on the shared pairing record so patient & caregiver stay in sync
  const applyDevice = (id: string) => {
    const code = session?.linkedCode ?? session?.pairCode;
    if (code) setPairingDevice(code, id);
    else updateSettings({ deviceId: id });
  };

  useEffect(() => {
    if (!scanning) return;
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        (text) => {
          applyDevice(text.trim());
          setScanMsg(`✅ Paired with ${text.trim()}`);
          setScanning(false);
        },
        () => {}
      )
      .catch((e) => {
        setScanMsg("Camera unavailable: " + (e instanceof Error ? e.message : String(e)));
        setScanning(false);
      });
    return () => {
      scanner.stop().catch(() => {});
      scannerRef.current = null;
    };
  }, [scanning, updateSettings]);

  const simulateScan = () => {
    applyDevice("mg-demo-01");
    setScanMsg("✅ Simulated scan — paired with mg-demo-01");
  };

  return (
    <Card>
      <h2 className="font-bold text-slate-800 mb-1">📿 Pendant pairing</h2>
      <p className="text-xs text-slate-500 mb-3">
        Paired device: <Badge tone="blue">{settings.deviceId}</Badge>
      </p>
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-white border border-slate-200 p-2">
          <QRCodeSVG value={settings.deviceId} size={96} />
        </div>
        <div className="flex-1 space-y-2">
          <button
            onClick={() => setScanning((s) => !s)}
            className="w-full rounded-xl bg-slate-800 text-white py-2 text-sm font-bold"
          >
            {scanning ? "Stop camera" : "📷 Scan pendant QR"}
          </button>
          <button
            onClick={simulateScan}
            className="w-full rounded-xl bg-slate-200 text-slate-700 py-2 text-sm font-bold"
          >
            🎭 Simulate scan
          </button>
        </div>
      </div>
      {scanning && <div id="qr-reader" className="mt-3 rounded-xl overflow-hidden" />}
      {scanMsg && <p className="mt-2 text-sm text-slate-600">{scanMsg}</p>}
      <div className="mt-3 flex gap-2">
        <input
          value={manualId}
          onChange={(e) => setManualId(e.target.value)}
          placeholder="Or type pendant id, e.g. mg-demo-01"
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
        />
        <button
          onClick={() => manualId.trim() && applyDevice(manualId.trim())}
          className="rounded-xl bg-teal-600 text-white px-4 text-sm font-bold"
        >
          Save
        </button>
      </div>
    </Card>
  );
}

// ---------------- Home location ----------------
function HomeSection() {
  const { settings, updateSettings } = useApp();
  const [h, setH] = useState(settings.home);
  return (
    <Card>
      <h2 className="font-bold text-slate-800 mb-3">🏠 Home location</h2>
      <div className="space-y-2">
        <input
          value={h.label}
          onChange={(e) => setH({ ...h, label: e.target.value })}
          placeholder="Address label"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <input
            type="number"
            step="0.0001"
            value={h.lat}
            onChange={(e) => setH({ ...h, lat: Number(e.target.value) })}
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Latitude"
          />
          <input
            type="number"
            step="0.0001"
            value={h.lon}
            onChange={(e) => setH({ ...h, lon: Number(e.target.value) })}
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Longitude"
          />
        </div>
        <button
          onClick={() => updateSettings({ home: h })}
          className="w-full rounded-xl bg-teal-600 text-white py-2 text-sm font-bold"
        >
          Save home location
        </button>
      </div>
    </Card>
  );
}

export default function Manage() {
  return (
    <div className="pb-28 min-h-dvh bg-slate-50">
      <PageHeader title="Manage" subtitle="Reminders, family, pendant and home" />
      <div className="px-4 space-y-4 max-w-md mx-auto">
        <LinkPatientCard />
        <RemindersSection />
        <ContactsSection />
        <PairingSection />
        <HomeSection />
      </div>
    </div>
  );
}
