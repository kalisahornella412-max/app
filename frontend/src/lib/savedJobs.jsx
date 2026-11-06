import { useCallback, useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "./api";
import { useAuth } from "./auth";

export function useSavedJobs() {
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) { setSavedIds(new Set()); setReady(true); return; }
    setReady(false);
    api.get("/me/saved-jobs")
      .then((r) => setSavedIds(new Set(r.data.map((j) => j.job_id))))
      .catch(() => {})
      .finally(() => setReady(true));
  }, [user]);

  const toggle = useCallback(async (job) => {
    if (!user) return toast.error("Sign in to save jobs");
    if (!ready) return;
    const id = String(job.id);
    if (savedIds.has(id)) {
      await api.delete(`/saved/jobs/${encodeURIComponent(id)}`);
      setSavedIds((s) => { const n = new Set(s); n.delete(id); return n; });
      toast.success("Removed from saved jobs");
    } else {
      await api.post("/saved/jobs", {
        job_id: id,
        title: job.title,
        employer: job.employer || null,
        location: job.location || null,
        wage: job.wage || null,
        apply_url: job.apply_url,
        source: job.source || "Halifax Youth Hub",
        posted_at: job.posted_at || null,
      });
      setSavedIds((s) => new Set(s).add(id));
      toast.success("Job saved to dashboard");
    }
  }, [user, savedIds, ready]);

  return { savedIds, toggle, isSaved: (id) => savedIds.has(String(id)) };
}

export function SaveJobButton({ job, saved, onToggle, className = "", testId }) {
  return (
    <button
      type="button"
      data-testid={testId}
      title={saved ? "Remove from saved" : "Save job"}
      aria-pressed={saved}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(job); }}
      className={`brutal-border brutal-press p-1.5 ${saved ? "bg-[#FFD100]" : "bg-white hover:bg-[#FFD100]/60"} ${className}`}
    >
      {saved ? <BookmarkCheck size={14} strokeWidth={3} /> : <Bookmark size={14} strokeWidth={3} />}
    </button>
  );
}
