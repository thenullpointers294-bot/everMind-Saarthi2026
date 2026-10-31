import { useMemo, useState } from "react";
import { Sparkles, RotateCcw, Calendar, CheckCircle2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { PageHeader } from "../../components/ui";

const EMOJI = ["🌸", "🐦", "🍎", "☀️", "🌳", "🎈"];

function shuffled(): { id: number; face: string }[] {
  return [...EMOJI, ...EMOJI]
    .map((face, i) => ({ id: i, face }))
    .sort(() => Math.random() - 0.5);
}

function MemoryMatch() {
  const [cards, setCards] = useState(shuffled);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const won = matched.length === EMOJI.length;

  const flip = (idx: number) => {
    if (flipped.length === 2 || flipped.includes(idx) || matched.includes(cards[idx].face)) return;
    const next = [...flipped, idx];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (cards[a].face === cards[b].face) {
        setTimeout(() => {
          setMatched((m) => [...m, cards[a].face]);
          setFlipped([]);
        }, 400);
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  };

  const reset = () => {
    setCards(shuffled());
    setFlipped([]);
    setMatched([]);
    setMoves(0);
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-slate-700" />
          <h2 className="font-semibold text-slate-900 text-sm">Matching Pairs</h2>
        </div>
        <span className="text-xs font-mono font-medium text-slate-400">Moves: {moves}</span>
      </div>
      {won ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-base font-bold text-slate-900">Wonderful! You matched all tiles.</p>
          <button 
            onClick={reset} 
            className="mt-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Play Again</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2.5">
          {cards.map((c, i) => {
            const up = flipped.includes(i) || matched.includes(c.face);
            return (
              <button
                key={c.id}
                onClick={() => flip(i)}
                className={`aspect-square rounded-2xl text-2xl flex items-center justify-center transition-all cursor-pointer ${
                  up
                    ? "bg-slate-50 border border-slate-200 shadow-inner"
                    : "bg-slate-900 hover:bg-slate-800 text-transparent shadow-sm"
                }`}
              >
                {up ? c.face : "✦"}
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-3.5 text-[11px] text-slate-400 text-center">
        Take your time — enjoyable cognitive engagement at your own pace.
      </p>
    </div>
  );
}

function DayQuiz() {
  const { now } = useApp();
  const [answer, setAnswer] = useState<string | null>(null);
  const correct = now.toLocaleDateString(undefined, { weekday: "long" });
  const options = useMemo(() => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const others = days.filter((d) => d !== correct).sort(() => Math.random() - 0.5).slice(0, 2);
    return [correct, ...others].sort(() => Math.random() - 0.5);
  }, [correct]);

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-slate-700" />
        <h2 className="font-semibold text-slate-900 text-sm">What day is it today?</h2>
      </div>
      <div className="space-y-2">
        {options.map((d) => (
          <button
            key={d}
            onClick={() => setAnswer(d)}
            className={`w-full rounded-xl py-2.5 px-4 font-semibold text-sm border transition-all cursor-pointer text-left flex items-center justify-between ${
              answer === null
                ? "border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
                : d === correct
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                  : d === answer
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-slate-50 text-slate-400"
            }`}
          >
            <span>{d}</span>
            {answer && d === correct && <span className="text-emerald-600 font-bold text-xs">Correct ✓</span>}
          </button>
        ))}
      </div>
      {answer && (
        <p className="mt-3 text-center text-xs font-medium text-slate-600">
          {answer === correct ? "Well done! Today is indeed " + correct + "." : `Today is ${correct}. You're doing great.`}
        </p>
      )}
    </div>
  );
}

export default function WearerGames() {
  return (
    <div className="pb-28 min-h-dvh bg-slate-50">
      <PageHeader title="Memory & Engagement" subtitle="Gentle cognitive exercises designed for daily routine" />
      <div className="px-5 space-y-4 max-w-md mx-auto">
        <MemoryMatch />
        <DayQuiz />
        <p className="text-center text-[11px] text-slate-400 leading-relaxed pt-1">
          Engagement activities are for stimulation and routine management only — they do not diagnose or treat medical conditions.
        </p>
      </div>
    </div>
  );
}
