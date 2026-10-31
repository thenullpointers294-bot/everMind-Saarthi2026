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
        "rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_1px_2px_rgba(15,23,42,0.02)] border border-slate-200/80 p-5 transition-all",
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
    slate: "bg-slate-100 text-slate-700 border-slate-200/80",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
    amber: "bg-amber-50 text-amber-800 border-amber-200/70",
    red: "bg-rose-50 text-rose-700 border-rose-200/70",
    blue: "bg-indigo-50 text-indigo-700 border-indigo-200/70",
    violet: "bg-purple-50 text-purple-700 border-purple-200/70",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
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
      <Badge tone="green" className="ml-2 font-normal">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live · {backend === "rtdb" ? "RTDB" : "Cloud"}
      </Badge>
    );
  return (
    <Badge tone="slate" className="ml-2 font-normal">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Demo
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
    <header className="flex items-start justify-between gap-3 px-5 pt-6 pb-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center">
          {title}
          <DemoBadge />
        </h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
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
    <nav className="fixed bottom-0 inset-x-0 z-[1000] bg-white/80 backdrop-blur-xl border-t border-slate-200/70 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
      <div className="max-w-md mx-auto grid grid-cols-4 px-2">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px] tracking-wide font-medium transition-all relative",
                isActive
                  ? "text-slate-900 font-semibold"
                  : "text-slate-400 hover:text-slate-600"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    "p-1 rounded-xl transition-colors",
                    isActive ? "bg-slate-100 text-slate-900" : "text-slate-400"
                  )}
                >
                  {t.icon}
                </div>
                <span>{t.label}</span>
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-slate-900" />
                )}
              </>
            )}
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
    recent: { tone: "green" as const, label: "Live (<1 min)" },
    updated: { tone: "blue" as const, label: "Recent (<10 min)" },
    old: { tone: "amber" as const, label: "Stale (>10 min)" },
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
        "w-full rounded-2xl py-4 px-5 text-base font-semibold shadow-sm active:scale-[0.98] transition-all cursor-pointer",
        className
      )}
    >
      {children}
    </button>
  );
}
