import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { simulator } from "../../services/deviceService";
import { nextReminder, formatTime12, REMINDER_ICONS } from "../../utils/reminderUtils";
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
    <div className="pb-28 bg-gradient-to-b from-teal-50 to-slate-50 min-h-dvh">
      {/* Greeting header */}
      <div className="bg-gradient-to-br from-teal-600 to-emerald-500 text-white px-5 pt-8 pb-10 rounded-b-[2rem] shadow-lg">
        <div className="flex items-center justify-between">
          <p className="text-teal-100 font-medium">{greeting} 🌤️</p>
          <DemoBadge />
        </div>
        <h1 className="text-3xl font-extrabold mt-1">{settings.wearerName}</h1>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-lg font-semibold">{dateStr}</p>
            <p className="text-teal-100 text-sm">It is {timeStr} now</p>
          </div>
          <div className="text-5xl">🕐</div>
        </div>
      </div>

      <div className="px-4 -mt-6 space-y-4 max-w-md mx-auto">
        {/* Orientation card */}
        <div className="rounded-2xl bg-white shadow-md border border-teal-100 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-600">
            Where am I?
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-800 leading-snug">
            Today is {dateStr}. You are at{" "}
            <span className="text-teal-700">{settings.home.label.split("—")[0].trim().toLowerCase()}</span>. 🏠
          </p>
          <p className="text-sm text-slate-500 mt-1">{settings.home.label}</p>
        </div>

        {/* Next reminder */}
        {next && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
            <div className="text-3xl">{REMINDER_ICONS[next.type]}</div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                Next reminder
              </p>
              <p className="font-semibold text-slate-800">{next.title}</p>
              <p className="text-sm text-amber-700 font-medium">at {formatTime12(next.time)}</p>
            </div>
          </div>
        )}

        {/* Confirmation toast */}
        {sent && (
          <div className="rounded-2xl bg-emerald-600 text-white p-4 text-center font-semibold shadow-lg">
            {sent === "sos"
              ? "✅ Help message sent. Your family has been told."
              : "✅ Your family can now see where you are and guide you home."}
          </div>
        )}

        {/* SOS */}
        <button
          onClick={sendSOS}
          className="w-full rounded-3xl bg-gradient-to-b from-rose-500 to-rose-600 text-white py-8 shadow-xl shadow-rose-200 active:scale-[0.97] transition-transform"
        >
          <div className="text-4xl">🆘</div>
          <div className="text-2xl font-extrabold mt-1">I need help</div>
          <div className="text-rose-100 text-sm font-medium">Press here and family will be told</div>
        </button>

        {/* Take me home */}
        <button
          onClick={sendHome}
          className="w-full rounded-3xl bg-gradient-to-b from-sky-500 to-blue-600 text-white py-6 shadow-lg shadow-sky-200 active:scale-[0.97] transition-transform"
        >
          <div className="text-3xl">🏠</div>
          <div className="text-xl font-extrabold mt-1">Take me home</div>
          <div className="text-sky-100 text-sm font-medium">Family will see your location and help</div>
        </button>

        {/* Call family */}
        <div>
          <p className="px-1 text-sm font-bold text-slate-600 mb-2">Call family with one tap</p>
          <div className="grid grid-cols-1 gap-2.5">
            {contacts.slice(0, 3).map((c) => (
              <a
                key={c.id}
                href={`tel:${c.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 p-3.5 shadow-sm active:scale-[0.98] transition-transform"
              >
                <span
                  className="h-12 w-12 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0"
                  style={{ background: c.color }}
                >
                  {c.name[0]}
                </span>
                <span className="flex-1">
                  <span className="block font-bold text-slate-800 text-lg">
                    {c.name} {c.id === primary?.id && "⭐"}
                  </span>
                  <span className="block text-sm text-slate-500">{c.relation}</span>
                </span>
                <span className="h-11 w-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">
                  📞
                </span>
              </a>
            ))}
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 pb-2 leading-relaxed">
          Memory Guardian is a supportive companion, not a medical device.
        </p>
      </div>
    </div>
  );
}
