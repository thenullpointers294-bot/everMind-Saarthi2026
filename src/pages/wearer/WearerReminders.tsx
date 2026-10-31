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

export default function WearerReminders() {
  const { reminders, now } = useApp();
  const today = reminders
    .filter((r) => isForToday(r, now))
    .sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const markDone = (id: string) => {
    const r = reminders.find((x) => x.id === id);
    if (r) saveReminder({ ...r, doneToday: new Date().toISOString().slice(0, 10) });
  };

  return (
    <div className="pb-28 min-h-dvh bg-slate-50">
      <PageHeader title="Today's reminders" subtitle={now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} />
      <div className="px-4 space-y-3 max-w-md mx-auto">
        {today.length === 0 && (
          <p className="text-center text-slate-500 py-10">No reminders today 🎉</p>
        )}
        {today.map((r) => {
          const done = isDoneToday(r, now);
          const due = !done && minutesOf(r.time) <= nowMin;
          return (
            <div
              key={r.id}
              className={`rounded-2xl border p-4 flex items-center gap-3 shadow-sm ${
                done
                  ? "bg-emerald-50 border-emerald-200"
                  : due
                    ? "bg-amber-50 border-amber-300"
                    : "bg-white border-slate-200"
              }`}
            >
              <div className="text-3xl">{REMINDER_ICONS[r.type]}</div>
              <div className="flex-1">
                <p className={`font-bold text-lg ${done ? "text-emerald-700 line-through" : "text-slate-800"}`}>
                  {r.title}
                </p>
                <p className="text-sm text-slate-500 font-medium">
                  {formatTime12(r.time)} {due && <span className="text-amber-700 font-bold">· Now!</span>}
                </p>
              </div>
              {done ? (
                <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
              ) : (
                <button
                  onClick={() => markDone(r.id)}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 font-semibold text-xs active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  Done
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
