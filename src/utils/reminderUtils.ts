import type { Reminder } from "../types";

export function isForToday(r: Reminder, d = new Date()): boolean {
  return r.days.length === 0 || r.days.includes(d.getDay());
}

export function isDoneToday(r: Reminder, d = new Date()): boolean {
  return r.doneToday === d.toISOString().slice(0, 10);
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Next not-yet-done reminder today (or the first one tomorrow). */
export function nextReminder(reminders: Reminder[], now = new Date()): Reminder | null {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = reminders
    .filter((r) => isForToday(r, now) && !isDoneToday(r, now) && minutesOf(r.time) >= nowMin)
    .sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
  if (today.length) return today[0];
  const tomorrow = new Date(now.getTime() + 86_400_000);
  const tmrw = reminders
    .filter((r) => isForToday(r, tomorrow))
    .sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
  return tmrw[0] ?? null;
}

export const REMINDER_ICONS: Record<Reminder["type"], string> = {
  medicine: "💊",
  meal: "🍲",
  activity: "🚶",
  appointment: "🩺",
  other: "📌",
};
