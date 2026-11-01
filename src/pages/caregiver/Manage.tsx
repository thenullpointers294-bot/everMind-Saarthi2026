import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { 
  Clock, 
  Users, 
  QrCode, 
  MapPin, 
  Plus, 
  Trash2, 
  Edit3, 
  Camera, 
  Sparkles,
  Save,
  Radio,
  Home
} from "lucide-react";
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <input
        value={r.title}
        onChange={(e) => setR({ ...r, title: e.target.value })}
        placeholder="Reminder title (e.g. Morning Blood Pressure Pill)"
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
      />
      <div className="flex gap-2">
        <input
          type="time"
          value={r.time}
          onChange={(e) => setR({ ...r, time: e.target.value })}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-slate-800 transition"
        />
        <select
          value={r.type}
          onChange={(e) => setR({ ...r, type: e.target.value as Reminder["type"] })}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-slate-800 transition"
        >
          {Object.keys(REMINDER_ICONS).map((t) => (
            <option key={t} value={t}>
              {REMINDER_ICONS[t as Reminder["type"]]} {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] text-slate-500 font-medium">Repeat Schedule</p>
          <button
            type="button"
            onClick={() => setR({ ...r, days: [] })}
            className={`text-[11px] font-semibold transition cursor-pointer ${
              r.days.length === 0 ? "text-emerald-700 font-bold" : "text-blue-600 hover:text-blue-700"
            }`}
          >
            {r.days.length === 0 ? "✓ Every Day (Active)" : "Set to Every Day"}
          </button>
        </div>
        <div className="flex gap-1.5">
          {DAY_LABELS.map((d, i) => (
            <button
              key={i}
              type="button"
              onClick={() =>
                setR({
                  ...r,
                  days: r.days.includes(i) ? r.days.filter((x) => x !== i) : [...r.days, i],
                })
              }
              className={`h-7 w-7 rounded-lg text-xs font-semibold transition cursor-pointer ${
                r.days.includes(i)
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          {r.days.length === 0 ? "Repeats every single day" : `Repeats on ${r.days.map((d) => DAY_LABELS[d]).join(", ")}`}
        </p>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            if (r.title.trim()) {
              saveReminder(r);
              onClose();
            }
          }}
          className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2 text-xs font-semibold transition cursor-pointer"
        >
          Save Reminder
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 bg-white hover:bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-600 transition cursor-pointer"
        >
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
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-700" />
          <h2 className="font-semibold text-slate-900 text-sm">Daily Reminders</h2>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setAdding(true);
          }}
          className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 flex items-center gap-1 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>
      <div className="space-y-2">
        {adding && (
          <ReminderEditor
            key="new-reminder-form"
            onClose={() => setAdding(false)}
          />
        )}
        {reminders.map((r) =>
          editing === r.id ? (
            <ReminderEditor key={r.id} initial={r} onClose={() => setEditing(null)} />
          ) : (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
              <span className="text-base">{REMINDER_ICONS[r.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">{r.title}</p>
                <p className="text-[11px] text-slate-400">
                  {formatTime12(r.time)} ·{" "}
                  {r.days.length === 0 ? "Daily" : r.days.map((d) => DAY_LABELS[d]).join(" ")}
                </p>
              </div>
              <button 
                onClick={() => setEditing(r.id)} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => deleteReminder(r.id)} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        )}
      </div>
    </Card>
  );
}

// ---------------- Contacts ----------------
function ContactEditor({
  initial,
  onSave,
  onClose,
}: {
  initial: Contact;
  onSave: (c: Contact) => void;
  onClose: () => void;
}) {
  const [v, setV] = useState(initial);
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
      <input
        value={v.name}
        onChange={(e) => setV({ ...v, name: e.target.value })}
        placeholder="Contact Name"
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
      />
      <input
        value={v.relation}
        onChange={(e) => setV({ ...v, relation: e.target.value })}
        placeholder="Relationship (e.g. Daughter, Caretaker)"
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
      />
      <input
        value={v.phone}
        onChange={(e) => setV({ ...v, phone: e.target.value })}
        placeholder="Phone Number (+91 98765 43210)"
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
      />
      <label className="flex items-center gap-2 text-xs font-medium text-slate-600 pt-1 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(v.isPrimary)}
          onChange={(e) => setV({ ...v, isPrimary: e.target.checked })}
          className="rounded border-slate-300 text-slate-900 focus:ring-slate-800"
        />
        <span>Set as Primary Contact</span>
      </label>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            if (v.name.trim()) {
              onSave(v);
              onClose();
            }
          }}
          className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2 text-xs font-semibold transition cursor-pointer"
        >
          Save Contact
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 bg-white hover:bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-600 transition cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ContactsSection() {
  const { contacts } = useApp();
  const [editing, setEditing] = useState<Contact | null>(null);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-700" />
          <h2 className="font-semibold text-slate-900 text-sm">Family Contacts</h2>
        </div>
        <button
          onClick={() =>
            setEditing({
              id: "c-" + Date.now(),
              name: "",
              relation: "",
              phone: "",
              color: ["#0f172a", "#334155", "#475569", "#2563eb"][Math.floor(Math.random() * 4)],
            })
          }
          className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 flex items-center gap-1 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>
      <div className="space-y-2">
        {editing && (
          <ContactEditor
            key={editing.id}
            initial={editing}
            onSave={(c) => saveContact(c)}
            onClose={() => setEditing(null)}
          />
        )}
        {contacts.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
            <span
              className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: c.color }}
            >
              {c.name[0]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {c.name} {c.isPrimary && <span className="text-amber-500 font-normal">· Primary</span>}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{c.relation} · {c.phone}</p>
            </div>
            <button 
              onClick={() => setEditing(c)} 
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => deleteContact(c.id)} 
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
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
          setScanMsg(`Paired successfully with ${text.trim()}`);
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
    setScanMsg("Simulated scan successful — paired with mg-demo-01");
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-slate-700" />
          <h2 className="font-semibold text-slate-900 text-sm">Pendant Device Link</h2>
        </div>
        <Badge tone="blue">ID: {settings.deviceId}</Badge>
      </div>
      <p className="text-xs text-slate-500 mb-3.5">
        Scan the QR code printed on the pendant hardware to bind device telemetry.
      </p>
      <div className="flex items-center gap-4">
        <div className="rounded-2xl bg-white border border-slate-200/80 p-2 shrink-0 shadow-sm">
          <QRCodeSVG value={settings.deviceId} size={88} />
        </div>
        <div className="flex-1 space-y-2">
          <button
            onClick={() => setScanning((s) => !s)}
            className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{scanning ? "Stop Camera" : "Scan Pendant QR"}</span>
          </button>
          <button
            onClick={simulateScan}
            className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-400" />
            <span>Simulate Scan</span>
          </button>
        </div>
      </div>
      {scanning && <div id="qr-reader" className="mt-3 rounded-2xl overflow-hidden border border-slate-200" />}
      {scanMsg && <p className="mt-2.5 text-xs font-medium text-emerald-700">{scanMsg}</p>}
      <div className="mt-3.5 flex gap-2">
        <input
          value={manualId}
          onChange={(e) => setManualId(e.target.value)}
          placeholder="Manual Device ID (e.g. mg-demo-01)"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
        />
        <button
          onClick={() => manualId.trim() && applyDevice(manualId.trim())}
          className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 text-xs font-semibold transition cursor-pointer"
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
  const [locating, setLocating] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setH((prev) => ({
          ...prev,
          lat: Number(pos.coords.latitude.toFixed(5)),
          lon: Number(pos.coords.longitude.toFixed(5)),
          label: prev.label === "Clock Tower, Dehradun" ? "My Home" : prev.label,
        }));
        setLocating(false);
      },
      (err) => {
        alert("Failed to get location: " + err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Home className="w-4 h-4 text-slate-700" />
          <h2 className="font-semibold text-slate-900 text-sm">Home Geofence Anchor</h2>
        </div>
        <button
          type="button"
          onClick={detectLocation}
          disabled={locating}
          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
        >
          <MapPin className="w-3 h-3" />
          <span>{locating ? "Detecting..." : "Use Current GPS"}</span>
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-3.5">
        Primary safe-zone reference coordinates used for navigation guidance and route mapping.
      </p>
      <div className="space-y-2.5">
        <input
          value={h.label}
          onChange={(e) => setH({ ...h, label: e.target.value })}
          placeholder="Address / Area Label"
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
        />
        <div className="flex gap-2">
          <input
            type="number"
            step="0.0001"
            value={h.lat}
            onChange={(e) => setH({ ...h, lat: Number(e.target.value) })}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-slate-800 transition"
            placeholder="Latitude"
          />
          <input
            type="number"
            step="0.0001"
            value={h.lon}
            onChange={(e) => setH({ ...h, lon: Number(e.target.value) })}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-slate-800 transition"
            placeholder="Longitude"
          />
        </div>
        <button
          onClick={() => updateSettings({ home: h })}
          className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2 text-xs font-semibold tracking-tight transition cursor-pointer mt-1"
        >
          Save Safe-Zone Coordinates
        </button>
      </div>
    </Card>
  );
}

export default function Manage() {
  const { session } = useApp();
  return (
    <div className="pb-28 min-h-dvh bg-slate-50">
      <PageHeader title="Care Management" subtitle="Reminders, family circle, pendant pairing, and safe zones" />
      <div className="px-5 space-y-4 max-w-md mx-auto">
        <LinkPatientCard />
        {!session?.linkedCode && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-3.5 text-xs text-amber-800 flex items-start gap-2.5">
            <span className="text-base">⚠️</span>
            <div>
              <p className="font-bold">Not Connected to Wearer</p>
              <p className="mt-0.5 text-[11px] text-amber-700 leading-relaxed">
                Please enter the 6-digit code shown on the wearer's phone in the box above so your reminders, contacts, and live location sync to their app.
              </p>
            </div>
          </div>
        )}
        <RemindersSection />
        <ContactsSection />
        <PairingSection />
        <HomeSection />
      </div>
    </div>
  );
}
