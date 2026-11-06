import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Flame, Send, FileText, MessageSquare, ArrowRight, Trophy } from "lucide-react";

const stats = [
  { key: "applied", label: "Applied", icon: Send },
  { key: "letter", label: "Letters", icon: FileText },
  { key: "mock", label: "Mock interviews", icon: MessageSquare },
];

export default function ProgressCard({ refreshKey }) {
  const [p, setP] = useState(null);
  useEffect(() => { api.get("/me/progress").then((r) => setP(r.data)).catch(() => {}); }, [refreshKey]);
  if (!p) return null;
  const streak = p.streak_weeks;
  return (
    <div data-testid="progress-card" className="brutal-border brutal-shadow bg-black text-white p-6 lg:col-span-3 grid md:grid-cols-12 gap-6 items-center">
      <div className="md:col-span-3 flex items-center gap-3">
        <div className={`w-16 h-16 brutal-border flex items-center justify-center ${streak > 0 ? "bg-[#FFD100] text-black" : "bg-white/10 text-white/60"}`}>
          <Flame size={32} strokeWidth={2.5} />
        </div>
        <div>
          <p data-testid="streak-weeks" className="font-display font-black text-4xl leading-none">{streak}<span className="text-base ml-1 text-white/70">wk</span></p>
          <p className="label-overline text-[#FFD100] mt-1">{streak > 0 ? "Weekly streak" : "Start your streak"}</p>
          <p className="text-[11px] text-white/60 mt-0.5">{p.active_this_week ? "Active this week" : "Nothing logged this week yet"}</p>
        </div>
      </div>
      <div className="md:col-span-4 grid grid-cols-3 gap-2">
        {stats.map(({ key, label, icon: Icon }) => (
          <div key={key} data-testid={`progress-stat-${key}`} className="border-2 border-white/25 p-3">
            <Icon size={14} strokeWidth={3} className="text-[#FFD100]" />
            <p className="font-display font-black text-2xl leading-none mt-2">{p.this_week[key]}</p>
            <p className="text-[10px] uppercase font-bold text-white/70 mt-1 leading-tight">{label} this week</p>
          </div>
        ))}
      </div>
      <div className="md:col-span-5">
        <p className="label-overline text-[#FFD100] mb-2 inline-flex items-center gap-1"><Trophy size={12} strokeWidth={3} />Next best moves</p>
        {p.nudges.length === 0 ? (
          <p className="text-sm text-white/80">You're on top of everything — {p.totals.applied} applied, {p.totals.letters} letters, {p.totals.mocks} mocks completed. Keep going.</p>
        ) : (
          <ul className="space-y-2">
            {p.nudges.map((n) => (
              <li key={n.key}>
                <Link to={n.to} data-testid={`nudge-${n.key}`} className="flex items-start justify-between gap-2 bg-white/5 hover:bg-white/10 border-2 border-white/20 px-3 py-2 text-sm">
                  <span>{n.text}</span><ArrowRight size={14} strokeWidth={3} className="shrink-0 mt-0.5 text-[#FFD100]" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
