import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { ArrowLeft, MapPin, Calendar, Briefcase, ExternalLink } from "lucide-react";

export default function JobDetailPage() {
  const { id } = useParams();
  const [j, setJ] = useState(null);
  useEffect(() => { api.get(`/jobs/${id}`).then((r) => setJ(r.data)); }, [id]);
  if (!j) return <div className="p-12 text-center font-display font-bold uppercase">Loading…</div>;

  return (
    <div data-testid="job-detail" className="bg-white max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link to="/jobs" className="inline-flex items-center gap-1 font-display font-bold uppercase text-sm mb-6 hover:bg-[#FFD100] px-2 py-1">
        <ArrowLeft size={16} strokeWidth={3} /> All jobs
      </Link>
      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <span className="label-overline text-[#FF3B30]">{j.category}</span>
          <h1 className="font-display font-black tracking-tighter text-4xl sm:text-5xl mt-2 leading-[0.95]">{j.title}</h1>
          <p className="mt-2 font-display font-semibold text-lg text-black/70">{j.employer}</p>

          <div className="mt-6 flex flex-wrap gap-2 text-sm font-bold">
            <span className="bg-white brutal-border px-3 py-1 inline-flex items-center gap-1"><MapPin size={14} strokeWidth={3} />{j.location}</span>
            <span className="bg-white brutal-border px-3 py-1 inline-flex items-center gap-1"><Briefcase size={14} strokeWidth={3} />{j.type}</span>
            {j.deadline && <span className="bg-[#FF3B30] text-white brutal-border px-3 py-1 inline-flex items-center gap-1"><Calendar size={14} strokeWidth={3} />Closes {new Date(j.deadline).toLocaleDateString()}</span>}
          </div>

          <div className="mt-8">
            <h2 className="font-display font-black text-2xl mb-3">About this role</h2>
            <p className="leading-relaxed text-black/80 whitespace-pre-line">{j.description}</p>
          </div>
        </div>
        <aside className="lg:col-span-4">
          <div className="brutal-border brutal-shadow bg-[#FFD100] p-6 sticky top-24">
            <span className="label-overline">Wage</span>
            <div className="font-display font-black text-3xl mt-1">{j.wage}</div>
            <div className="mt-4 text-sm font-bold">Min age: {j.age_min}+</div>
            {j.apply_url && (
              <a href={j.apply_url} target="_blank" rel="noreferrer" data-testid="apply-job-btn"
                 className="mt-6 w-full bg-black text-white brutal-border brutal-shadow brutal-press px-6 py-3 font-display font-bold uppercase tracking-wide flex items-center justify-center gap-2">
                Apply now <ExternalLink size={16} strokeWidth={3} />
              </a>
            )}
            <Link to="/resume" className="mt-3 w-full bg-white brutal-border brutal-shadow-sm brutal-press px-6 py-2 font-display font-bold uppercase text-sm flex items-center justify-center">
              Polish resume first →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
