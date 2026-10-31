import { useMemo, useState } from "react";
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
        }, 500);
      } else {
        setTimeout(() => setFlipped([]), 900);
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
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-slate-800">🃏 Matching pairs</h2>
        <span className="text-sm text-slate-500">Moves: {moves}</span>
      </div>
      {won ? (
        <div className="text-center py-6">
          <div className="text-5xl">🎉</div>
          <p className="mt-2 text-lg font-bold text-emerald-700">Wonderful! You found them all!</p>
          <button onClick={reset} className="mt-4 rounded-xl bg-teal-600 text-white px-6 py-3 font-bold">
            Play again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {cards.map((c, i) => {
            const up = flipped.includes(i) || matched.includes(c.face);
            return (
              <button
                key={c.id}
                onClick={() => flip(i)}
                className={`aspect-square rounded-xl text-3xl flex items-center justify-center transition-all duration-300 ${
                  up
                    ? "bg-teal-50 border-2 border-teal-300"
                    : "bg-gradient-to-br from-teal-500 to-emerald-500 shadow-sm"
                }`}
              >
                {up ? c.face : ""}
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-xs text-slate-400 text-center">
        Take your time — there is no hurry. 💚
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
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <h2 className="font-bold text-slate-800 mb-3">📅 What day is it today?</h2>
      <div className="grid grid-cols-1 gap-2">
        {options.map((d) => (
          <button
            key={d}
            onClick={() => setAnswer(d)}
            className={`rounded-xl py-3 font-bold border-2 transition-colors ${
              answer === null
                ? "border-slate-200 bg-slate-50 text-slate-700"
                : d === correct
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                  : d === answer
                    ? "border-rose-300 bg-rose-50 text-rose-600"
                    : "border-slate-200 bg-slate-50 text-slate-400"
            }`}
          >
            {d}
          </button>
        ))}
      </div>
      {answer && (
        <p className="mt-3 text-center font-semibold text-slate-700">
          {answer === correct ? "🎉 That's right! Well done!" : `It's okay! Today is ${correct}. 😊`}
        </p>
      )}
    </div>
  );
}

export default function WearerGames() {
  return (
    <div className="pb-28 min-h-dvh bg-slate-50">
      <PageHeader title="Brain games" subtitle="Fun little exercises — just for enjoyment" />
      <div className="px-4 space-y-4 max-w-md mx-auto">
        <MemoryMatch />
        <DayQuiz />
        <p className="text-center text-[11px] text-slate-400 leading-relaxed">
          Games are for enjoyment and gentle routine only — they do not measure,
          diagnose or treat memory or any medical condition.
        </p>
      </div>
    </div>
  );
}
