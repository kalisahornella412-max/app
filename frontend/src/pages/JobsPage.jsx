import { useEffect, useState, useMemo } from "react";
import { api } from "../lib/api";
import { useAudience } from "../lib/audience";
import { Search, Briefcase, MapPin, Calendar, Clock } from "lucide-react";
import JobFeeds from "../components/JobFeeds";
import LiveJobs from "../components/LiveJobs";
import { useSavedJobs, SaveJobButton } from "../lib/savedJobs";

const postedAgo = (iso) => {
  if (!iso) return null;
  const days = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000));
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 7) return `Posted ${days}d ago`;
  return `Posted ${Math.floor(days / 7)}w ago`;
};

export default function JobsPage() {
  const { audience } = useAudience();
  const { isSaved, toggle } = useSavedJobs();
  const [jobs, setJobs] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => { api.get(`/jobs?audience=${audience}`).then((r) => setJobs(r.data)); }, [audience]);

  const categories = useMemo(() => ["all", ...new Set(jobs.map((j) => j.category))], [jobs]);

  const filtered = jobs.filter((j) => {
    if (category !== "all" && j.category !== category) return false;
    if (q) {
      const t = q.toLowerCase();
      if (!`${j.title} ${j.employer} ${j.description}`.toLowerCase().includes(t)) return false;
    }
    return true;
  });

  return (
    <div data-testid="jobs-page" className="bg-white">
      <section className="border-b-2 border-black bg-[#0055A4] text-white">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <span className="label-overline text-[#FFD100]">/ Jobs · {audience === "immigrant" ? "Newcomers" : "Youth"}</span>
          <h1 className="font-display font-black tracking-tighter text-5xl sm:text-6xl mt-2">
            {audience === "immigrant" ? "Newcomer-friendly Jobs." : "Halifax Job Board."}
          </h1>
          <p className="mt-3 max-w-2xl text-white/85">
            {audience === "immigrant"
              ? "Roles open to newcomers + always-current feeds from Job Bank, Indeed, ISANS and more."
              : "Live feeds from Job Bank, HRM Careers, NS Government + a few hand-picked spotlights."}
          </p>
          <div className="mt-8 grid md:grid-cols-12 gap-3">
            <div className="md:col-span-9 relative">
              <Search size={18} strokeWidth={3} className="absolute left-3 top-1/2 -translate-y-1/2 text-black pointer-events-none" />
              <input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search jobs, employers…"
                data-testid="jobs-search"
                className="w-full bg-white text-black brutal-border brutal-shadow-sm pl-10 pr-3 py-3 font-medium focus:outline-none focus:bg-[#FFFCEA]"
              />
            </div>
            <select
              value={category} onChange={(e) => setCategory(e.target.value)}
              data-testid="jobs-category"
              className="md:col-span-3 bg-white text-black brutal-border brutal-shadow-sm px-3 py-3 font-bold uppercase text-sm"
            >
              {categories.map((c) => <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>)}
            </select>
          </div>
        </div>
      </section>

      <LiveJobs />

      <JobFeeds />

      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <span className="label-overline">/ Spotlight openings</span>
            <h2 className="font-display font-black tracking-tighter text-3xl sm:text-4xl mt-1">Hand-picked roles.</h2>
          </div>
          <p className="font-mono-d text-sm">{filtered.length} spotlight{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {filtered.map((j) => (
            <a
              key={j.id}
              href={j.apply_url || "#"}
              target="_blank"
              rel="noreferrer"
              data-testid={`job-card-${j.id}`}
              className="brutal-border brutal-shadow brutal-press bg-white p-6 flex flex-col"
            >
              <div className="flex flex-col-reverse sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="label-overline text-[#FF3B30]">{j.category}</span>
                    {j.posted_at && (
                      <span data-testid={`job-posted-${j.id}`} className="label-overline text-[#0055A4] inline-flex items-center gap-1"><Clock size={10} strokeWidth={3} />{postedAgo(j.posted_at)}</span>
                    )}
                  </div>
                  <h3 className="font-display font-black text-2xl mt-1 tracking-tight leading-tight">{j.title}</h3>
                  <p className="font-display font-bold text-black/70 mt-1">{j.employer}</p>
                </div>
                <div className="bg-[#FFD100] brutal-border px-3 py-1 font-display font-black text-sm self-start shrink-0 sm:max-w-[45%] sm:text-right">{j.wage}</div>
              </div>
              <p className="mt-3 text-sm text-black/75 line-clamp-2">{j.short_description}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                <span className="bg-white brutal-border px-2 py-0.5 inline-flex items-center gap-1"><MapPin size={12} strokeWidth={3} />{j.location}</span>
                <span className="bg-white brutal-border px-2 py-0.5 inline-flex items-center gap-1"><Briefcase size={12} strokeWidth={3} />{j.type}</span>
                {j.deadline && <span className="bg-[#FF3B30] text-white brutal-border px-2 py-0.5 inline-flex items-center gap-1"><Calendar size={12} strokeWidth={3} />Closes {new Date(j.deadline).toLocaleDateString()}</span>}
              </div>
              <div className="mt-4 pt-3 border-t-2 border-black flex justify-between items-center">
                <span className="font-display font-bold uppercase text-sm">View on {(j.apply_url || "").replace(/^https?:\/\/(www\.)?/i, "").split("/")[0] || "site"} →</span>
                <SaveJobButton job={{ ...j, source: "Spotlight" }} saved={isSaved(j.id)} onToggle={toggle} testId={`save-job-${j.id}`} />
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
