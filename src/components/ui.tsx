import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "../utils/cn";
import { isDemo, backend } from "../services/dataService";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white shadow-sm border border-slate-100 p-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "slate",
  className,
}: {
  children: ReactNode;
  tone?: "slate" | "green" | "amber" | "red" | "blue" | "violet";
  className?: string;
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-rose-100 text-rose-700",
    blue: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function DemoBadge() {
  if (!isDemo)
    return (
      <Badge tone="green" className="ml-2">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live · {backend === "rtdb" ? "Realtime DB" : "Firestore"}
      </Badge>
    );
  return (
    <Badge tone="amber" className="ml-2">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Demo data
    </Badge>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 px-4 pt-5 pb-3">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center">
          {title}
          <DemoBadge />
        </h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export interface TabDef {
  to: string;
  label: string;
  icon: ReactNode;
}

export function BottomNav({ tabs }: { tabs: TabDef[] }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-[1000] bg-white/95 backdrop-blur border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto grid grid-cols-4">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors",
                isActive ? "text-teal-600" : "text-slate-400 hover:text-slate-600"
              )
            }
          >
            <span className="text-xl leading-none">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function FreshnessBadge({
  freshness,
}: {
  freshness: "recent" | "updated" | "old" | "none";
}) {
  if (freshness === "none") return <Badge tone="slate">No location yet</Badge>;
  const map = {
    recent: { tone: "green" as const, label: "Recent (<1 min)" },
    updated: { tone: "blue" as const, label: "Updated (<10 min)" },
    old: { tone: "amber" as const, label: "Old (>10 min)" },
  };
  const m = map[freshness];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function BigButton({
  onClick,
  className,
  children,
}: {
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl py-5 text-lg font-bold shadow-md active:scale-[0.98] transition-transform",
        className
      )}
    >
      {children}
    </button>
  );
}
