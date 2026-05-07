import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Link } from "react-router-dom";
import { Bookmark, FileText, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [events, setEvents] = useState([]);

  async function reload() {
    const [s, r, rs, ev] = await Promise.all([
      api.get("/me/saved-programs"),
      api.get("/resumes"),
      api.get("/me/rsvps"),
      api.get("/events"),
    ]);
    setSaved(s.data); setResumes(r.data); setRsvps(rs.data); setEvents(ev.data);
  }

  useEffect(() => { reload(); }, []);

  const rsvpedEvents = events.filter((e) => rsvps.some((r) => r.event_id === e.id));

  async function deleteResume(id) {
    if (!window.confirm("Delete this resume?")) return;
    await api.delete(`/resumes/${id}`);
    toast.success("Deleted");
    reload();
  }

  return (
    <div data-testid="dashboard-page" className="bg-white">
      <section className="border-b-2 border-black bg-[#F4F4F4]">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <span className="label-overline">/ Dashboard</span>
          <h1 className="font-display font-black tracking-tighter text-5xl sm:text-6xl mt-2">Hi, {user?.name?.split(" ")[0] || "friend"}.</h1>
          <p className="mt-3 text-black/75">Your hub: saved programs, resumes, and the events you RSVP'd to.</p>
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid lg:grid-cols-3 gap-6">
        {/* SAVED */}
        <div className="brutal-border brutal-shadow bg-white p-6">
          <div className="flex items-center gap-2 mb-4"><Bookmark size={20} strokeWidth={3} /><h2 className="font-display font-black text-xl">Saved Programs</h2></div>
          {saved.length === 0 ? (
            <p className="text-sm text-black/60">Nothing saved yet. <Link to="/programs" className="underline font-bold">Browse →</Link></p>
          ) : saved.map((p) => (
            <Link key={p.id} to={`/programs/${p.id}`} data-testid={`dashboard-saved-${p.slug}`} className="block border-b-2 border-black/20 last:border-0 py-3 hover:bg-[#FFD100]/30 px-1">
              <p className="font-display font-bold leading-tight">{p.name}</p>
              <p className="text-xs text-black/60">{p.organization}</p>
            </Link>
          ))}
        </div>

        {/* RESUMES */}
        <div className="brutal-border brutal-shadow bg-[#FFD100] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><FileText size={20} strokeWidth={3} /><h2 className="font-display font-black text-xl">My Resumes</h2></div>
            <Link to="/resume" className="bg-black text-white brutal-border brutal-shadow-sm brutal-press text-xs font-bold uppercase px-2 py-1">+ New</Link>
          </div>
          {resumes.length === 0 ? (
            <p className="text-sm text-black/70">No resumes yet. <Link to="/resume" className="underline font-bold">Build one →</Link></p>
          ) : resumes.map((r) => (
            <div key={r.id} data-testid={`dashboard-resume-${r.id}`} className="border-b-2 border-black/20 last:border-0 py-3 flex items-center justify-between gap-2">
              <Link to={`/resume?id=${r.id}`} className="flex-1">
                <p className="font-display font-bold leading-tight">{r.title}</p>
                <p className="text-xs text-black/70">{r.full_name || "—"} · {new Date(r.updated_at).toLocaleDateString()}</p>
              </Link>
              <button onClick={() => deleteResume(r.id)} className="p-1 hover:bg-[#FF3B30] hover:text-white"><Trash2 size={14} strokeWidth={3} /></button>
            </div>
          ))}
        </div>

        {/* RSVPs */}
        <div className="brutal-border brutal-shadow bg-[#0055A4] text-white p-6">
          <div className="flex items-center gap-2 mb-4"><Calendar size={20} strokeWidth={3} /><h2 className="font-display font-black text-xl">Upcoming RSVPs</h2></div>
          {rsvpedEvents.length === 0 ? (
            <p className="text-sm text-white/80">No RSVPs. <Link to="/events" className="underline font-bold">Find events →</Link></p>
          ) : rsvpedEvents.map((e) => (
            <div key={e.id} data-testid={`dashboard-rsvp-${e.id}`} className="border-b-2 border-white/30 last:border-0 py-3">
              <p className="font-display font-bold leading-tight">{e.title}</p>
              <p className="text-xs text-white/80">{new Date(e.starts_at).toLocaleString()} · {e.location}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
