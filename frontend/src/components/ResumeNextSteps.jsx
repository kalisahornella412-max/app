import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAudience } from "../lib/audience";
import { useSavedJobs, SaveJobButton } from "../lib/savedJobs";
import { ClosingBadge } from "../lib/applications";
import CoverLetterDialog from "./CoverLetterDialog";
import { Sparkles, ArrowRight, Rocket } from "lucide-react";

export default function ResumeNextSteps({ resumeId }) {
  const { audience } = useAudience();
  const { isSaved, toggle } = useSavedJobs();
  const [jobs, setJobs] = useState([]);
  const [dialog, setDialog] = useState({ open: false, job: null });

  useEffect(() => {
    api.get(`/jobs?audience=${audience}`).then((r) => setJobs(r.data.slice(0, 4))).catch(() => {});
  }, [audience]);

  if (!resumeId) return null;

  return (
    <div data-testid="resume-next-steps" className="brutal-border brutal-shadow bg-[#0055A4] text-white p-5 print:hidden">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <span className="label-overline text-[#FFD100] inline-flex items-center gap-1"><Rocket size={12} strokeWidth={3} />Resume saved — now use it</span>
          <h3 className="font-display font-black text-xl tracking-tight mt-1">Where this resume can go this week.</h3>
          <p className="text-sm text-white/80 mt-1">Pick a role, let AI draft a cover letter from this resume, then apply on the employer's site.</p>
        </div>
        <button onClick={() => setDialog({ open: true, job: null })} data-testid="next-steps-cover-letter" className="bg-[#FFD100] text-black brutal-border brutal-shadow-sm brutal-press px-3 py-2 font-display font-bold text-xs uppercase inline-flex items-center gap-1">
          <Sparkles size={12} strokeWidth={3} />Cover letter for any job
        </button>
      </div>
      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        {jobs.map((j) => (
          <div key={j.id} data-testid={`next-step-job-${j.id}`} className="bg-white text-black brutal-border p-3 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <span className="label-overline text-[#FF3B30]">{j.category}</span>
              <ClosingBadge deadline={j.deadline} />
            </div>
            <p className="font-display font-bold leading-tight mt-1">{j.title}</p>
            <p className="text-xs text-black/60">{j.employer}</p>
            <div className="mt-2 pt-2 border-t-2 border-black/20 flex items-center justify-between gap-2">
              <button onClick={() => setDialog({ open: true, job: { ...j, job_id: j.id, description: j.short_description } })} data-testid={`next-step-letter-${j.id}`} className="bg-[#FFD100] brutal-border brutal-press px-2 py-1 font-bold uppercase text-[11px] inline-flex items-center gap-1"><Sparkles size={11} strokeWidth={3} />Letter</button>
              <div className="flex items-center gap-2">
                <SaveJobButton job={{ ...j, source: "Spotlight" }} saved={isSaved(j.id)} onToggle={toggle} testId={`next-step-save-${j.id}`} />
                <a href={j.apply_url} target="_blank" rel="noreferrer" className="font-bold uppercase text-[11px] inline-flex items-center gap-1">Apply <ArrowRight size={11} strokeWidth={3} /></a>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Link to="/jobs" data-testid="next-steps-all-jobs" className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase text-[#FFD100]">See all live Halifax openings <ArrowRight size={12} strokeWidth={3} /></Link>
      <CoverLetterDialog open={dialog.open} onOpenChange={(o) => setDialog((s) => ({ ...s, open: o }))} job={dialog.job} />
    </div>
  );
}
