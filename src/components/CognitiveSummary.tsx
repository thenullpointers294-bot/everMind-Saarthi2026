import { useMemo, useState } from "react";
import { Brain, TrendingUp, Clock, Award, CheckCircle2, Copy, Check, FileText, ChevronRight } from "lucide-react";
import type { GameSession } from "../types";
import { copyToClipboard } from "../utils/clipboard";
import { Card, Badge } from "./ui";

type TimeRange = "daily" | "weekly" | "monthly";

export default function CognitiveSummary({
  games,
  wearerName,
}: {
  games: GameSession[];
  wearerName: string;
}) {
  const [range, setRange] = useState<TimeRange>("weekly");
  const [copied, setCopied] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);

  // Filter sessions based on selected range
  const filteredSessions = useMemo(() => {
    const now = Date.now();
    const cutoff =
      range === "daily"
        ? now - 24 * 60 * 60 * 1000
        : range === "weekly"
          ? now - 7 * 24 * 60 * 60 * 1000
          : now - 30 * 24 * 60 * 60 * 1000;
    return games.filter((g) => g.completedAt >= cutoff);
  }, [games, range]);

  // Clinical metrics calculation
  const metrics = useMemo(() => {
    if (!filteredSessions.length) {
      return {
        avgScore: 0,
        avgLatencyMs: 0,
        completedCount: 0,
        consistencyRating: "No Data",
      };
    }
    const totalScore = filteredSessions.reduce((acc, s) => acc + s.score, 0);
    const latencies = filteredSessions
      .map((s) => s.latencyMs ?? (s.durationSeconds ? s.durationSeconds * 1000 : null))
      .filter((v): v is number => v !== null && v > 0);
    const avgLatencyMs = latencies.length
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;
    const avgScore = Math.round(totalScore / filteredSessions.length);

    const consistencyRating =
      avgScore >= 85
        ? "High Stability"
        : avgScore >= 65
          ? "Moderate / Normal"
          : "Requires Monitoring";

    return {
      avgScore,
      avgLatencyMs,
      completedCount: filteredSessions.length,
      consistencyRating,
    };
  }, [filteredSessions]);

  // Aggregate daily points for the SVG trend chart (last 7 or 14 periods)
  const chartPoints = useMemo(() => {
    const daysMap: Record<string, { totalScore: number; count: number; dateStr: string }> = {};
    const count = range === "daily" ? 24 : range === "weekly" ? 7 : 30;
    const now = new Date();

    // Initialize buckets
    if (range === "weekly") {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const label = days[d.getDay()];
        daysMap[label] = { totalScore: 0, count: 0, dateStr: label };
      }
      filteredSessions.forEach((s) => {
        const label = days[new Date(s.completedAt).getDay()];
        if (daysMap[label]) {
          daysMap[label].totalScore += s.score;
          daysMap[label].count += 1;
        }
      });
    } else {
      for (let i = Math.min(count, 10); i >= 0; i--) {
        const d = new Date(now.getTime() - i * (range === "daily" ? 3600000 : 86400000));
        const label = range === "daily" ? `${d.getHours()}:00` : `${d.getDate()}/${d.getMonth() + 1}`;
        daysMap[label] = { totalScore: 0, count: 0, dateStr: label };
      }
      filteredSessions.forEach((s) => {
        const d = new Date(s.completedAt);
        const label = range === "daily" ? `${d.getHours()}:00` : `${d.getDate()}/${d.getMonth() + 1}`;
        if (daysMap[label]) {
          daysMap[label].totalScore += s.score;
          daysMap[label].count += 1;
        }
      });
    }

    return Object.values(daysMap).map((b) => ({
      label: b.dateStr,
      avg: b.count ? Math.round(b.totalScore / b.count) : 0,
      count: b.count,
    }));
  }, [filteredSessions, range]);

  const copyDoctorReport = async () => {
    const report = `========================================
EVERMIND CLINICAL COGNITIVE SUMMARY
Patient Name: ${wearerName}
Report Period: ${range.toUpperCase()} (Generated on ${new Date().toLocaleDateString()})
========================================

1. COGNITIVE VITALITY METRICS:
- Overall Engagement Score: ${metrics.avgScore}%
- Mean Response Latency: ${metrics.avgLatencyMs ? `${metrics.avgLatencyMs} ms` : "N/A"}
- Assessment Exercises Completed: ${metrics.completedCount}
- Cognitive Stability Index: ${metrics.consistencyRating}

2. RECORDED SESSIONS SUMMARY:
${
  filteredSessions.length
    ? filteredSessions
        .slice(0, 10)
        .map(
          (s) =>
            `- ${new Date(s.completedAt).toLocaleDateString()} ${new Date(s.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}: ${s.gameTitle} | Score: ${s.score}% | Duration: ${s.durationSeconds}s`
        )
        .join("\n")
    : "No exercises recorded during this evaluation period."
}

========================================
Note: Memory Guardian is a supportive cognitive routine tracker. This summary provides longitudinal behavioral data to assist medical professionals during clinical consultation.
========================================`;

    const ok = await copyToClipboard(report);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="p-4.5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Brain className="w-4 h-4 stroke-[2]" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Cognitive Health & Trends</h2>
            <p className="text-[11px] text-slate-400">Longitudinal cognitive reaction data for doctors</p>
          </div>
        </div>
        <Badge tone="blue">{metrics.consistencyRating}</Badge>
      </div>

      {/* Range Segmented Selector */}
      <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 mb-4 text-xs font-semibold">
        {(["daily", "weekly", "monthly"] as TimeRange[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`rounded-lg py-1.5 capitalize transition-all cursor-pointer ${
              range === r
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Primary Clinical KPI Cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Mean Score
          </span>
          <p className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {metrics.avgScore ? `${metrics.avgScore}%` : "—"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Avg Latency
          </span>
          <p className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {metrics.avgLatencyMs ? `${(metrics.avgLatencyMs / 1000).toFixed(1)}s` : "—"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Completed
          </span>
          <p className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {metrics.completedCount}
          </p>
        </div>
      </div>

      {/* SVG Minimal Trend Bar Chart */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 mb-4">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-2 px-1">
          <span>{range.toUpperCase()} ACCURACY SCORE (%)</span>
          <span className="font-mono text-[10px] text-slate-400">Target: &gt;75%</span>
        </div>

        <div className="grid grid-flow-col auto-cols-fr gap-2 items-end h-28 px-1 pt-3 pb-1 border-b border-slate-200">
          {chartPoints.map((pt, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
              <span className="text-[9px] font-mono text-slate-400">
                {pt.avg > 0 ? `${pt.avg}%` : "—"}
              </span>
              <div
                className={`w-full rounded-t-md transition-all duration-500 ${
                  pt.avg >= 80
                    ? "bg-slate-900"
                    : pt.avg >= 50
                      ? "bg-indigo-600"
                      : pt.avg > 0
                        ? "bg-rose-500"
                        : "bg-slate-200"
                }`}
                style={{ height: `${Math.max(8, pt.avg)}%` }}
                title={`${pt.label}: ${pt.avg}% (${pt.count} sessions)`}
              />
              <span className="text-[9px] font-semibold text-slate-500 truncate w-full text-center">
                {pt.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Exercises List */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Recent Patient Activities
          </span>
          <span className="text-[11px] text-slate-400">{filteredSessions.length} total</span>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500">
            No game sessions completed in this period.
            <p className="text-[11px] text-slate-400 mt-0.5">
              Sessions save automatically when the wearer plays Matching Pairs or Orientation Quizzes.
            </p>
          </div>
        ) : (
          filteredSessions.slice(0, 4).map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold">
                  {s.gameType === "matching_pairs" ? "🎴" : "📅"}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{s.gameTitle}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(s.completedAt).toLocaleDateString([], { month: "short", day: "numeric" })} · {s.durationSeconds}s duration
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-slate-900">{s.score}%</span>
                {s.moves && <p className="text-[10px] text-slate-400">{s.moves} moves</p>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Doctor Export / Copy Actions */}
      <div className="pt-2 border-t border-slate-100 flex gap-2">
        <button
          type="button"
          onClick={copyDoctorReport}
          className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Report Copied to Clipboard!" : "Copy Report for Doctor"}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowDoctorModal(true)}
          className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span>Clinical View</span>
        </button>
      </div>

      {/* Clinical Doctor Modal */}
      {showDoctorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-fade-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Doctor & Neurologist Report</h3>
                <p className="text-xs text-slate-400">EverMind Longitudinal Cognitive Vitality Sheet</p>
              </div>
              <button
                onClick={() => setShowDoctorModal(false)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] space-y-1">
                <p><b>Patient:</b> {wearerName}</p>
                <p><b>Evaluation Scope:</b> {range.toUpperCase()} ({metrics.completedCount} exercises)</p>
                <p><b>Mean Cognitive Index:</b> {metrics.avgScore}%</p>
                <p><b>Mean Reaction Latency:</b> {metrics.avgLatencyMs ? `${metrics.avgLatencyMs} ms` : "N/A"}</p>
                <p><b>Assessment Classification:</b> {metrics.consistencyRating}</p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 text-xs mb-1">Clinical Evaluation Guidance:</h4>
                <p className="leading-relaxed text-slate-500">
                  Memory Guardian captures response latency and decision accuracy across spatial matching and orientation tasks. Sudden shifts in mean latency (&gt;2,500 ms) or prolonged drops in accuracy score can signify delirium, medication side effects, or accelerated cognitive change.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 text-xs mb-1.5">Exercise History:</h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {filteredSessions.map((s) => (
                    <div key={s.id} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between text-[11px]">
                      <span>{new Date(s.completedAt).toLocaleString()} — {s.gameTitle}</span>
                      <span className="font-mono font-bold text-slate-800">{s.score}% ({s.durationSeconds}s)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={copyDoctorReport}
                className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied Report!" : "Copy Clinical Note"}</span>
              </button>
              <button
                onClick={() => setShowDoctorModal(false)}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
