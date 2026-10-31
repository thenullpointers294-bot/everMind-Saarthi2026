import { Phone, Star } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { PageHeader } from "../../components/ui";
import { PatientCodeCard } from "../../components/Pairing";

export default function WearerFamily() {
  const { contacts } = useApp();
  return (
    <div className="pb-28 min-h-dvh bg-slate-50">
      <PageHeader title="Family & Caregivers" subtitle="Tap any contact to start a phone call" />
      <div className="px-5 space-y-3.5 max-w-md mx-auto">
        <PatientCodeCard />
        {contacts.length === 0 && (
          <p className="text-center text-xs text-slate-400 py-6">
            No family contacts linked yet. Caregivers can add them once paired.
          </p>
        )}
        {contacts.map((c) => (
          <a
            key={c.id}
            href={`tel:${c.phone.replace(/\s/g, "")}`}
            className="flex items-center gap-4 rounded-2xl bg-white border border-slate-200/80 p-4 shadow-sm active:scale-[0.99] transition-all hover:border-slate-300"
          >
            <span
              className="h-14 w-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-sm"
              style={{ background: c.color }}
            >
              {c.name[0]}
            </span>
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-1.5 text-base font-bold text-slate-900 truncate">
                {c.name}
                {c.isPrimary && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}
              </span>
              <span className="block text-xs font-medium text-slate-500 mt-0.5">{c.relation}</span>
              <span className="block text-xs text-slate-400 font-mono mt-0.5">{c.phone}</span>
            </span>
            <span className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4" />
            </span>
          </a>
        ))}
        <p className="text-center text-xs text-slate-400 pt-3">
          Family members are always happy to hear from you.
        </p>
      </div>
    </div>
  );
}
