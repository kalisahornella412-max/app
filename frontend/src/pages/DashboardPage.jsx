import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Link, useNavigate } from "react-router-dom";
import { Bookmark, FileText, Calendar, Trash2, Briefcase, ExternalLink, X, Sparkles, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { StatusSelect, ClosingBadge, daysUntil } from "../lib/applications";
import CoverLetterDialog from "../components/CoverLetterDialog";
import InterviewPrepDialog from "../components/InterviewPrepDialog";
import ProgressCard from "../components/ProgressCard";
import ShareWinDialog from "../components/ShareWinDialog";
import BackButton from "../components/BackButton";

export default function DashboardPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [letters, setLetters] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [events, setEvents] = useState([]);
  const [letterDialog, setLetterDialog] = useState({ open: false, job: null, letter: null });
  const [prepDialog, setPrepDialog] = useState({ open: false, job: null });
  const [shareDialog, setShareDialog] = useState({ open: false, job: null });
  const [progressKey, setProgressKey] = useState(0);
  const bump = () => setProgressKey((k) => k + 1);
  const [digestSending, setDigestSending] = useState(false);

  async function reload() {
    const [s, sj, r, cl, rs, ev] = await Promise.all([
      api.get("/me/saved-programs"),
      api.get("/me/saved-jobs"),
      api.get("/resumes"),
      api.get("/cover-letters"),
      api.get("/me/rsvps"),
      api.get("/events"),
    ]);
    setSaved(s.data); setSavedJobs(sj.data); setResumes(r.data); setLetters(cl.data); setRsvps(rs.data); setEvents(ev.data);
  }

  useEffect(() => { reload(); }, []);

  const rsvpedEvents = events.filter((e) => rsvps.some((r) => r.event_id === e.id));
  const closingSoon = savedJobs.filter((j) => { const d = daysUntil(j.deadline); return d !== null && d >= 0 && d <= 7 && j.status !== "hired"; });

  async function deleteResume(id) {
    if (!window.confirm("Delete this resume?")) return;
    await api.delete(`/resumes/${id}`);
    toast.success("Deleted");
    reload();
  }

  async function removeJob(jobId) {
    await api.delete(`/saved/jobs/${encodeURIComponent(jobId)}`);
    setSavedJobs((list) => list.filter((j) => j.job_id !== jobId));
    toast.success("Removed from saved jobs");
  }

  async function deleteLetter(id) {
    if (!window.confirm("Delete this cover letter?")) return;
    await api.delete(`/cover-letters/${id}`);
    setLetters((l) => l.filter((x) => x.id !== id));
    toast.success("Deleted");
  }

  async function emailDigest() {
    setDigestSending(true);
    try {
      await api.post("/me/closing-soon-digest/preview");
      toast.success("Reminder sent to your inbox");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Couldn't send email");
    } finally { setDigestSending(false); }
  }

  function onLetterSaved(data) {
    setLetters((l) => [data, ...l.filter((x) => x.id !== data.id)]);
    bump();
  }

  async function toggleReminders() {
    try {
      const { data } = await api.patch("/me/preferences", { email_reminders: !(user?.email_reminders ?? true) });
      setUser(data);
      toast.success(data.email_reminders ? "Email reminders on" : "Email reminders off");
    } catch { toast.error("Couldn't update"); }
  }

  async function deleteAccount() {
    if (!window.confirm("Permanently delete your account, resumes, cover letters and saved items? This cannot be undone.")) return;
    try {
      await api.delete("/me");
      setUser(false);
      toast.success("Your account and data were deleted");
      navigate("/");
    } catch { toast.error("Couldn't delete account"); }
  }

  return (
    <div data-testid="dashboard-page" className="bg-white">
      <section className="border-b-2 border-black bg-[#F4F4F4]">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <BackButton />
          <span className="label-overline">/ Dashboard</span>
          <h1 className="font-display font-black tracking-tighter text-5xl sm:text-6xl mt-2">Hi, {user?.name?.split(" ")[0] || "friend"}.</h1>
          <p className="mt-3 text-black/75">Your hub: saved jobs & programs, application tracker, cover letters, resumes and RSVPs.</p>
          {closingSoon.length > 0 && (
            <div data-testid="closing-soon-alert" className="mt-5 brutal-border brutal-shadow-sm bg-[#FF3B30] text-white p-4 flex flex-wrap items-center justify-between gap-3">
              <p className="font-display font-bold text-sm">
                {closingSoon.length} saved job{closingSoon.length !== 1 ? "s" : ""} close{closingSoon.length === 1 ? "s" : ""} within 7 days — we email you a 9am reminder while they're open.
              </p>
              <button onClick={emailDigest} disabled={digestSending} data-testid="send-digest-now" className="bg-white text-black brutal-border brutal-press px-3 py-1.5 font-display font-bold text-xs uppercase inline-flex items-center gap-1 disabled:opacity-60">
                <Mail size={12} strokeWidth={3} />{digestSending ? "Sending…" : "Email me now"}
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid lg:grid-cols-3 gap-6">
        <ProgressCard refreshKey={progressKey} />
        {/* SAVED JOBS + TRACKER */}
        <div data-testid="dashboard-saved-jobs" className="brutal-border brutal-shadow bg-white p-6 lg:col-span-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2"><Briefcase size={20} strokeWidth={3} /><h2 className="font-display font-black text-xl">Saved Jobs & Application Tracker</h2></div>
            <span className="font-mono-d text-sm">{savedJobs.length}</span>
          </div>
          <p className="text-xs text-black/60 mb-4">Update each job's status as you go: Saved → Applied → Interviewed → Hired. Mark a job "Interviewed" to unlock the AI Interview Prep Coach.</p>
          {savedJobs.length === 0 ? (
            <p className="text-sm text-black/60">No saved jobs yet. <Link to="/jobs" className="underline font-bold">Browse live openings →</Link></p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedJobs.map((j) => (
                <div key={j.job_id} data-testid={`dashboard-saved-job-${j.job_id}`} className={`brutal-border p-4 flex flex-col ${j.status === "hired" ? "bg-[#E8F8EC]" : "bg-[#F4F4F4]"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      <span className="bg-[#FFD100] brutal-border px-2 py-0.5 font-display font-black text-[10px] uppercase">{j.source}</span>
                      <ClosingBadge deadline={j.deadline} testId={`closing-badge-${j.job_id}`} />
                    </div>
                    <button onClick={() => removeJob(j.job_id)} data-testid={`remove-saved-job-${j.job_id}`} title="Remove" className="p-1 hover:bg-[#FF3B30] hover:text-white"><X size={14} strokeWidth={3} /></button>
                  </div>
                  <p className="font-display font-bold leading-tight mt-2 capitalize">{j.title}</p>
                  <p className="text-xs text-black/60 mt-1">{[j.employer, j.location].filter(Boolean).join(" · ")}</p>
                  {j.wage && <p className="font-display font-black text-sm mt-1">{j.wage}</p>}
                  {j.deadline && <p className="text-[11px] text-black/60 mt-1">Closes {new Date(j.deadline).toLocaleDateString()}</p>}
                  <div className="mt-3 pt-2 border-t-2 border-black/20 flex items-center justify-between gap-2 flex-wrap">
                    <StatusSelect kind="jobs" id={j.job_id} value={j.status} testId={`job-status-${j.job_id}`}
                      onChange={(status) => { setSavedJobs((list) => list.map((x) => x.job_id === j.job_id ? { ...x, status } : x)); bump(); }} />
                    <div className="flex items-center gap-2">
                      {j.status === "hired" && (
                        <button onClick={() => setShareDialog({ open: true, job: j })} data-testid={`share-win-btn-${j.job_id}`} title="Share your win" className="bg-[#1DB954] text-white brutal-border brutal-press px-2 py-1 font-bold uppercase text-[11px] inline-flex items-center gap-1"><Sparkles size={11} strokeWidth={3} />Share</button>
                      )}
                      {(j.status === "interviewed" || j.status === "hired") && (
                        <button onClick={() => setPrepDialog({ open: true, job: j })} data-testid={`interview-prep-btn-${j.job_id}`} title="Interview prep" className="bg-[#0055A4] text-white brutal-border brutal-press px-2 py-1 font-bold uppercase text-[11px] inline-flex items-center gap-1"><Sparkles size={11} strokeWidth={3} />Prep</button>
                      )}
                      <button onClick={() => setLetterDialog({ open: true, job: j, letter: null })} data-testid={`cover-letter-btn-${j.job_id}`} title="Write cover letter" className="bg-white brutal-border brutal-press px-2 py-1 font-bold uppercase text-[11px] inline-flex items-center gap-1"><Sparkles size={11} strokeWidth={3} />Letter</button>
                      <a href={j.apply_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold uppercase text-xs">Apply <ExternalLink size={12} strokeWidth={3} /></a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SAVED PROGRAMS */}
        <div className="brutal-border brutal-shadow bg-white p-6">
          <div className="flex items-center gap-2 mb-4"><Bookmark size={20} strokeWidth={3} /><h2 className="font-display font-black text-xl">Saved Programs</h2></div>
          {saved.length === 0 ? (
            <p className="text-sm text-black/60">Nothing saved yet. <Link to="/programs" className="underline font-bold">Browse →</Link></p>
          ) : saved.map((p) => (
            <div key={p.id} data-testid={`dashboard-saved-${p.slug}`} className="border-b-2 border-black/20 last:border-0 py-3 flex items-center justify-between gap-2">
              <Link to={`/programs/${p.id}`} className="flex-1 hover:underline">
                <p className="font-display font-bold leading-tight">{p.name}</p>
                <p className="text-xs text-black/60">{p.organization}</p>
              </Link>
              <StatusSelect kind="programs" id={p.id} value={p.status} testId={`program-status-${p.slug}`}
                onChange={(status) => setSaved((list) => list.map((x) => x.id === p.id ? { ...x, status } : x))} />
            </div>
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

        {/* COVER LETTERS */}
        <div data-testid="dashboard-cover-letters" className="brutal-border brutal-shadow bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Sparkles size={20} strokeWidth={3} /><h2 className="font-display font-black text-xl">Cover Letters</h2></div>
            <button onClick={() => setLetterDialog({ open: true, job: null, letter: null })} data-testid="new-cover-letter" className="bg-black text-white brutal-border brutal-shadow-sm brutal-press text-xs font-bold uppercase px-2 py-1">+ New</button>
          </div>
          {letters.length === 0 ? (
            <p className="text-sm text-black/60">No cover letters yet. Hit "Letter" on a saved job to draft one with AI.</p>
          ) : letters.map((l) => (
            <div key={l.id} data-testid={`dashboard-letter-${l.id}`} className="border-b-2 border-black/20 last:border-0 py-3 flex items-center justify-between gap-2">
              <button onClick={() => setLetterDialog({ open: true, job: null, letter: l })} className="flex-1 text-left hover:underline">
                <p className="font-display font-bold leading-tight">{l.title}</p>
                <p className="text-xs text-black/60">{new Date(l.updated_at).toLocaleDateString()}</p>
              </button>
              <button onClick={() => deleteLetter(l.id)} data-testid={`delete-letter-${l.id}`} className="p-1 hover:bg-[#FF3B30] hover:text-white"><Trash2 size={14} strokeWidth={3} /></button>
            </div>
          ))}
        </div>

        {/* RSVPs */}
        <div className="brutal-border brutal-shadow bg-[#0055A4] text-white p-6 lg:col-span-3">
          <div className="flex items-center gap-2 mb-4"><Calendar size={20} strokeWidth={3} /><h2 className="font-display font-black text-xl">Upcoming RSVPs</h2></div>
          {rsvpedEvents.length === 0 ? (
            <p className="text-sm text-white/80">No RSVPs. <Link to="/events" className="underline font-bold">Find events →</Link></p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rsvpedEvents.map((e) => (
                <div key={e.id} data-testid={`dashboard-rsvp-${e.id}`} className="border-2 border-white/30 p-3">
                  <p className="font-display font-bold leading-tight">{e.title}</p>
                  <p className="text-xs text-white/80">{new Date(e.starts_at).toLocaleString()} · {e.location}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PRIVACY & ACCOUNT */}
        <div data-testid="dashboard-account" className="brutal-border bg-[#F4F4F4] p-5 lg:col-span-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} strokeWidth={3} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-display font-black">Your data, your call.</p>
              <p className="text-xs text-black/60 mt-0.5">We only email you about saved jobs closing soon. Read the <Link to="/privacy" className="underline font-bold">Privacy Policy</Link>.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={toggleReminders} data-testid="toggle-email-reminders" aria-pressed={user?.email_reminders ?? true}
              className={`brutal-border brutal-press px-3 py-1.5 font-display font-bold text-xs uppercase inline-flex items-center gap-1 ${(user?.email_reminders ?? true) ? "bg-[#FFD100]" : "bg-white"}`}>
              <Mail size={12} strokeWidth={3} />Email reminders: {(user?.email_reminders ?? true) ? "On" : "Off"}
            </button>
            <button onClick={deleteAccount} data-testid="delete-account" className="bg-white text-[#FF3B30] brutal-border brutal-press px-3 py-1.5 font-display font-bold text-xs uppercase inline-flex items-center gap-1 hover:bg-[#FF3B30] hover:text-white">
              <Trash2 size={12} strokeWidth={3} />Delete my account
            </button>
          </div>
        </div>
      </section>

      <ShareWinDialog open={shareDialog.open} onOpenChange={(o) => setShareDialog((s) => ({ ...s, open: o }))} job={shareDialog.job} name={user?.name} />
      <InterviewPrepDialog open={prepDialog.open} onOpenChange={(o) => { setPrepDialog((s) => ({ ...s, open: o })); if (!o) bump(); }} job={prepDialog.job} />
      <CoverLetterDialog
        open={letterDialog.open}
        onOpenChange={(o) => setLetterDialog((s) => ({ ...s, open: o }))}
        job={letterDialog.job}
        letter={letterDialog.letter}
        onSaved={onLetterSaved}
      />
    </div>
  );
}
