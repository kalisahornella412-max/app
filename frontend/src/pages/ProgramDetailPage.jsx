import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, MapPin, Users, Tag, Bookmark, BookmarkCheck } from "lucide-react";

export default function ProgramDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api.get(`/programs/${id}`).then((r) => setP(r.data)).catch((e) => setError("Program not found"));
  }, [id]);
  useEffect(() => {
    if (!p || !user || user === false) return;
    api.get("/me/saved-programs").then((r) => setSaved(r.data.some((x) => x.id === p.id))).catch(() => {});
  }, [p, user]);

  async function toggleSave() {
    if (!user || user === false) { toast.error("Sign in to save programs"); return; }
    if (!p) return;
    if (saved) {
      await api.delete(`/saved/programs/${p.id}`);
      setSaved(false); toast.success("Removed from saved");
    } else {
      await api.post(`/saved/programs/${p.id}`);
      setSaved(true); toast.success("Saved to dashboard");
    }
  }

  if (error) return <div className="p-12 text-center font-display font-bold">{error}</div>;
  if (!p) return <div className="p-12 text-center font-display font-bold uppercase tracking-widest">Loading…</div>;

  return (
    <div data-testid="program-detail" className="bg-white">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/programs" className="inline-flex items-center gap-1 font-display font-bold uppercase text-sm mb-6 hover:bg-[#FFD100] px-2 py-1">
          <ArrowLeft size={16} strokeWidth={3} /> All programs
        </Link>

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <span className="label-overline text-[#0055A4]">{p.category}</span>
            <h1 className="font-display font-black tracking-tighter text-4xl sm:text-5xl mt-2 leading-[0.95]">{p.name}</h1>
            <p className="mt-2 font-display font-semibold text-lg text-black/70">{p.organization}</p>

            <div className="mt-6 brutal-border brutal-shadow overflow-hidden">
              <div className="aspect-[16/9] bg-[#F4F4F4]">
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="mt-8 prose max-w-none">
              <h2 className="font-display font-black text-2xl mb-3">About this program</h2>
              <p className="leading-relaxed text-black/80 whitespace-pre-line">{p.description}</p>
            </div>
          </div>

          <aside className="lg:col-span-5">
            <div className="brutal-border brutal-shadow bg-[#FFD100] p-6 sticky top-24">
              <h3 className="font-display font-black text-xl uppercase tracking-tight">Quick facts</h3>
              <div className="mt-4 space-y-3 font-medium">
                <div className="flex items-start gap-2">
                  <Users size={18} strokeWidth={3} className="mt-0.5" />
                  <div><span className="label-overline">Age range</span><div className="font-display font-bold">{p.age_min}–{p.age_max} years</div></div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={18} strokeWidth={3} className="mt-0.5" />
                  <div><span className="label-overline">Where</span><div className="font-display font-bold">{p.neighbourhood}</div></div>
                </div>
                <div className="flex items-start gap-2">
                  <Tag size={18} strokeWidth={3} className="mt-0.5" />
                  <div className="flex-1"><span className="label-overline">Tags</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(p.tags || []).map((t) => <span key={t} className="text-xs font-bold bg-white brutal-border px-2 py-0.5">#{t}</span>)}
                    </div>
                  </div>
                </div>
              </div>
              {p.apply_url && (
                <a
                  href={p.apply_url} target="_blank" rel="noreferrer"
                  data-testid="apply-program-btn"
                  className="mt-6 w-full bg-black text-white brutal-border brutal-shadow brutal-press px-6 py-3 font-display font-bold uppercase tracking-wide flex items-center justify-center gap-2"
                >
                  Apply on official site <ExternalLink size={16} strokeWidth={3} />
                </a>
              )}
              <p data-testid="program-accuracy-note" className="mt-3 text-[11px] leading-snug text-black/60">
                Summarized from {p.organization}'s public website{p.source_checked ? ` (checked ${p.source_checked})` : ""}. Eligibility and dates can change — confirm on the official page before applying. Halifax Youth Hub is not affiliated with this organization.
              </p>
              <button
                onClick={toggleSave}
                data-testid="save-program-btn"
                className="mt-3 w-full bg-white brutal-border brutal-shadow-sm brutal-press px-6 py-3 font-display font-bold uppercase tracking-wide flex items-center justify-center gap-2"
              >
                {saved ? (<><BookmarkCheck size={16} strokeWidth={3} />Saved</>) : (<><Bookmark size={16} strokeWidth={3} />Save program</>)}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
