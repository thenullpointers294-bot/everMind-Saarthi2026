import { useApp } from "../../context/AppContext";
import { saveReminder } from "../../services/dataService";
import {
  isForToday,
  isDoneToday,
  minutesOf,
  formatTime12,
  REMINDER_ICONS,
} from "../../utils/reminderUtils";
import { PageHeader } from "../../components/ui";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function WearerReminders() {
  const { reminders, now } = useApp();
  const today = reminders
    .filter((r) => isForToday(r, now))
    .sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
  const otherDays = reminders
    .filter((r) => !isForToday(r, now))
    .sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const markDone = (id: string) => {
    const r = reminders.find((x) => x.id === id);
    if (r) saveReminder({ ...r, doneToday: new Date().toISOString().slice(0, 10) });
  };

  return (
    <div className="pb-28 min-h-dvh bg-slate-50">
      <PageHeader
        title="My Reminders"
        subtitle={now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
      />
      <div className="px-4 space-y-5 max-w-md mx-auto">
        {/* Today's Section */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Due Today</span>
            <span className="text-xs text-slate-500 font-medium">{today.length} scheduled</span>
          </div>

          {today.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-slate-500 text-xs">
              No tasks due for today 🎉
            </div>
          ) : (
            <div className="space-y-2.5">
              {today.map((r) => {
                const done = isDoneToday(r, now);
                const due = !done && minutesOf(r.time) <= nowMin;
                return (
                  <div
                    key={r.id}
                    className={`rounded-2xl border p-4 flex items-center gap-3.5 shadow-sm transition-all ${
                      done
                        ? "bg-emerald-50/70 border-emerald-200"
                        : due
                          ? "bg-amber-50 border-amber-300"
                          : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="text-2xl">{REMINDER_ICONS[r.type]}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-base leading-snug truncate ${done ? "text-emerald-700 line-through" : "text-slate-900"}`}>
                        {r.title}
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {formatTime12(r.time)} {due && <span className="text-amber-700 font-bold">· Due Now</span>}
                      </p>
                    </div>
                    {done ? (
                      <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        ✓
                      </div>
                    ) : (
                      <button
                        onClick={() => markDone(r.id)}
                        className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 font-semibold text-xs active:scale-95 transition-all shadow-sm cursor-pointer"
                      >
                        Done
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Other Scheduled Routine */}
        {otherDays.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Other Scheduled Days</span>
            </div>
            <div className="space-y-2">
              {otherDays.map((r) => (
                <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 flex items-center gap-3 shadow-sm">
                  <div className="text-xl">{REMINDER_ICONS[r.type]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{r.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatTime12(r.time)} · {r.days.map((d) => DAY_NAMES[d]).join(", ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
