import { useState } from "react";
import { 
  AlertOctagon, 
  Navigation, 
  MapPin, 
  Clock, 
  Phone, 
  CheckCircle2, 
  HeartHandshake 
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { simulator } from "../../services/deviceService";
import { nextReminder, formatTime12 } from "../../utils/reminderUtils";
import { DemoBadge } from "../../components/ui";

export default function WearerHome() {
  const { settings, reminders, contacts, now } = useApp();
  const [sent, setSent] = useState<"sos" | "home" | null>(null);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeStr = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const next = nextReminder(reminders, now);
  const primary = contacts.find((c) => c.isPrimary) ?? contacts[0];

  const sendSOS = async () => {
    await simulator.pressSOS(settings.deviceId);
    setSent("sos");
    setTimeout(() => setSent(null), 6000);
  };
  const sendHome = async () => {
    await simulator.pressHome(settings.deviceId);
    setSent("home");
    setTimeout(() => setSent(null), 6000);
  };

  return (
    <div className="pb-28 bg-slate-50 min-h-dvh">
      {/* Aesthetic Top Greeting Header */}
      <div className="bg-white border-b border-slate-200/80 px-6 pt-10 pb-7 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span>{greeting}</span>
          <DemoBadge />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
          {settings.wearerName}
        </h1>
        <div className="mt-3 flex items-center justify-between text-slate-500 text-sm">
          <span>{dateStr}</span>
          <span className="font-semibold text-slate-900 font-mono bg-slate-100 px-2.5 py-1 rounded-lg">
            {timeStr}
          </span>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4 max-w-md mx-auto">
        {/* Orientation card */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 shrink-0">
            <MapPin className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Current Location
            </span>
            <p className="font-semibold text-slate-900 text-base leading-snug mt-0.5">
              You are safe at home.
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{settings.home.label}</p>
          </div>
        </div>

        {/* Next reminder */}
        {next && (
          <div className="rounded-2xl bg-white border border-amber-200/80 p-4 shadow-sm flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 shrink-0">
              <Clock className="w-5 h-5 stroke-[2]" />
            </div>
            <div className="flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Upcoming Reminder
              </span>
              <p className="font-semibold text-slate-900 text-sm mt-0.5">{next.title}</p>
              <p className="text-xs text-slate-500 font-medium">Scheduled at {formatTime12(next.time)}</p>
            </div>
          </div>
        )}

        {/* Confirmation toast */}
        {sent && (
          <div className="rounded-2xl bg-emerald-700 text-white p-4 text-center font-medium shadow-md flex items-center justify-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-5 h-5" />
            <span>
              {sent === "sos"
                ? "Help alert sent. Caregivers have been notified."
                : "Caregiver has received your location and can guide you home."}
            </span>
          </div>
        )}

        {/* High-visibility tactile SOS button */}
        <button
          onClick={sendSOS}
          className="w-full rounded-2xl bg-rose-600 hover:bg-rose-700 text-white py-6 px-5 shadow-[0_4px_16px_rgba(225,29,72,0.25)] active:scale-[0.98] transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5"
        >
          <AlertOctagon className="w-10 h-10 animate-pulse stroke-[2]" />
          <span className="text-xl font-bold tracking-tight">I Need Help</span>
          <span className="text-rose-100 text-xs font-normal">
            Press to alert your family immediately
          </span>
        </button>

        {/* Take me home */}
        <button
          onClick={sendHome}
          className="w-full rounded-2xl bg-slate-900 hover:bg-slate-800 text-white py-4 px-5 shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-3"
        >
          <Navigation className="w-5 h-5 text-slate-300" />
          <span className="text-sm font-semibold tracking-tight">Take Me Home</span>
        </button>

        {/* Call family section */}
        <div className="pt-2">
          <p className="px-1 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
            Quick Family Contacts
          </p>
          <div className="space-y-2">
            {contacts.slice(0, 3).map((c) => (
              <a
                key={c.id}
                href={`tel:${c.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-3.5 rounded-2xl bg-white border border-slate-200/80 p-3.5 shadow-sm active:scale-[0.99] transition-all hover:border-slate-300"
              >
                <span
                  className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ background: c.color }}
                >
                  {c.name[0]}
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-slate-900 text-sm">
                    {c.name} {c.id === primary?.id && "· Primary"}
                  </span>
                  <span className="block text-xs text-slate-500">{c.relation}</span>
                </span>
                <span className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </span>
              </a>
            ))}
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 pt-3 pb-2 leading-relaxed">
          EverMind is a supportive routine companion, not a medical device.
        </p>
      </div>
    </div>
  );
}
