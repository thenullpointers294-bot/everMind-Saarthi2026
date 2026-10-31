import { useApp } from "../../context/AppContext";
import { PageHeader } from "../../components/ui";
import { PatientCodeCard } from "../../components/Pairing";

export default function WearerFamily() {
  const { contacts } = useApp();
  return (
    <div className="pb-28 min-h-dvh bg-slate-50">
      <PageHeader title="My family" subtitle="Tap a card to call" />
      <div className="px-4 space-y-3 max-w-md mx-auto">
        <PatientCodeCard />
        {contacts.length === 0 && (
          <p className="text-center text-slate-500 py-6">
            No family contacts yet. Your caretaker can add them once connected.
          </p>
        )}
        {contacts.map((c) => (
          <a
            key={c.id}
            href={`tel:${c.phone.replace(/\s/g, "")}`}
            className="flex items-center gap-4 rounded-2xl bg-white border border-slate-200 p-4 shadow-sm active:scale-[0.98] transition-transform"
          >
            <span
              className="h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0"
              style={{ background: c.color }}
            >
              {c.name[0]}
            </span>
            <span className="flex-1">
              <span className="block text-xl font-bold text-slate-800">
                {c.name} {c.isPrimary && "⭐"}
              </span>
              <span className="block text-slate-500">{c.relation}</span>
              <span className="block text-sm text-slate-400">{c.phone}</span>
            </span>
            <span className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl">
              📞
            </span>
          </a>
        ))}
        <p className="text-center text-sm text-slate-400 pt-4">
          These people love you and are always happy to hear from you. 💚
        </p>
      </div>
    </div>
  );
}
