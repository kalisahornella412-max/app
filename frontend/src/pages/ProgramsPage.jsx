import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Search, Bookmark, BookmarkCheck } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useAudience } from "../lib/audience";
import { toast } from "sonner";

export default function ProgramsPage() {
  const { user } = useAuth();
  const { audience } = useAudience();
  const [programs, setPrograms] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [neighbourhood, setNeighbourhood] = useState("all");
  const [savedIds, setSavedIds] = useState(new Set());

  useEffect(() => {
    api.get(`/programs?audience=${audience}`).then((r) => setPrograms(r.data));
  }, [audience]);

  useEffect(() => {
    if (user && user !== false) {
      api.get("/me/saved-programs").then((r) => setSavedIds(new Set(r.data.map((p) => p.id)))).catch(() => {});
    }
  }, [user]);

  const categories = useMemo(() => ["all", ...new Set(programs.map((p) => p.category))], [programs]);
  const neighbourhoods = useMemo(() => ["all", ...new Set(programs.map((p) => p.neighbourhood))], [programs]);

  const filtered = programs.filter((p) => {
    if (category !== "all" && p.category !== category) return false;
    if (neighbourhood !== "all" && p.neighbourhood !== neighbourhood) return false;
    if (q) {
      const t = q.toLowerCase();
      const hay = `${p.name} ${p.organization} ${p.description} ${(p.tags || []).join(" ")}`.toLowerCase();
      if (!hay.includes(t)) return false;
    }
    return true;
  });

  async function toggleSave(id) {
    if (!user || user === false) return toast.error("Sign in to save programs");
    if (savedIds.has(id)) {
      await api.delete(`/saved/programs/${id}`);
      setSavedIds((s) => { const n = new Set(s); n.delete(id); return n; });
      toast.success("Removed from saved");
    } else {
      await api.post(`/saved/programs/${id}`);
      setSavedIds((s) => new Set(s).add(id));
      toast.success("Saved to dashboard");
    }
  }

  return (
    <div data-testid="programs-page" className="bg-white">
      <section className="border-b-2 border-black bg-[#F4F4F4]">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <span className="label-overline">/ Programs · {audience === "immigrant" ? "Newcomers" : "Youth"}</span>
          <h1 className="font-display font-black tracking-tighter text-5xl sm:text-6xl mt-2">Programs Directory.</h1>
          <p className="mt-3 max-w-2xl text-black/75">
            {audience === "immigrant"
              ? "Settlement, employment readiness, language support, mentorship — programs built for newcomers in Halifax."
              : "Mentorship, paid training, leadership, entrepreneurship, wellness — built for Halifax youth."}
          </p>

          <div className="mt-8 grid md:grid-cols-12 gap-3">
            <div className="md:col-span-6 relative">
              <Search size={18} strokeWidth={3} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search programs, orgs, tags…"
                data-testid="programs-search"
                className="w-full bg-white brutal-border brutal-shadow-sm pl-10 pr-3 py-3 font-medium focus:outline-none focus:bg-[#FFFCEA]"
              />
            </div>
            <select
              value={category} onChange={(e) => setCategory(e.target.value)}
              data-testid="programs-category"
              className="md:col-span-3 bg-white brutal-border brutal-shadow-sm px-3 py-3 font-bold uppercase text-sm"
            >
              {categories.map((c) => <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>)}
            </select>
            <select
              value={neighbourhood} onChange={(e) => setNeighbourhood(e.target.value)}
              data-testid="programs-neighbourhood"
              className="md:col-span-3 bg-white brutal-border brutal-shadow-sm px-3 py-3 font-bold uppercase text-sm"
            >
              {neighbourhoods.map((c) => <option key={c} value={c}>{c === "all" ? "All neighbourhoods" : c}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="font-mono-d text-sm mb-6">{filtered.length} program{filtered.length !== 1 ? "s" : ""}</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => (
            <div key={p.id} className="brutal-border brutal-shadow bg-white flex flex-col" data-testid={`program-card-${p.slug}`}>
              <Link to={`/programs/${p.id}`} className="aspect-[16/10] border-b-2 border-black overflow-hidden bg-[#F4F4F4] block">
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
              </Link>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <span className="label-overline text-[#0055A4]">{p.category}</span>
                  <button
                    onClick={() => toggleSave(p.id)}
                    data-testid={`save-program-${p.slug}`}
                    className="p-1 hover:bg-[#FFD100]"
                    title={savedIds.has(p.id) ? "Saved" : "Save"}
                  >
                    {savedIds.has(p.id) ? <BookmarkCheck size={18} strokeWidth={3} /> : <Bookmark size={18} strokeWidth={3} />}
                  </button>
                </div>
                <Link to={`/programs/${p.id}`}>
                  <h3 className="font-display font-black text-xl mt-1.5 leading-tight">{p.name}</h3>
                </Link>
                <p className="text-xs font-bold text-black/60 mt-1">{p.organization}</p>
                <p className="mt-2 text-sm text-black/75 line-clamp-3">{p.short_description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="text-xs font-bold bg-[#FFD100] brutal-border px-2 py-0.5">Ages {p.age_min}–{p.age_max}</span>
                  <span className="text-xs font-bold bg-white brutal-border px-2 py-0.5">{p.neighbourhood}</span>
                  {(p.tags || []).slice(0, 2).map((t) => (
                    <span key={t} className="text-xs font-bold bg-[#F4F4F4] brutal-border px-2 py-0.5">#{t}</span>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t-2 border-black flex justify-between items-center">
                  {p.apply_url ? (
                    <a href={p.apply_url} target="_blank" rel="noreferrer" data-testid={`details-${p.slug}`} className="font-display font-bold uppercase text-sm hover:bg-[#FFD100] px-2 py-1">Details →</a>
                  ) : (
                    <Link to={`/programs/${p.id}`} className="font-display font-bold uppercase text-sm hover:bg-[#FFD100] px-2 py-1">Details →</Link>
                  )}
                  {p.apply_url && (
                    <a href={p.apply_url} target="_blank" rel="noreferrer" data-testid={`apply-${p.slug}`} className="bg-[#0055A4] text-white brutal-border brutal-shadow-sm brutal-press px-3 py-1 font-bold text-xs uppercase">
                      Apply
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
