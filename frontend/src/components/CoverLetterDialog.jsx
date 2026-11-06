import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { api } from "../lib/api";
import { Sparkles, Copy, Download, Save, FileText } from "lucide-react";
import { toast } from "sonner";

const inputCls = "mt-1 w-full bg-white brutal-border px-3 py-2 text-sm focus:outline-none focus:bg-[#FFFCEA]";

export default function CoverLetterDialog({ open, onOpenChange, job, letter, onSaved }) {
  const [resumes, setResumes] = useState([]);
  const [resumeId, setResumeId] = useState("");
  const [form, setForm] = useState({ job_title: "", employer: "", job_description: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    api.get("/resumes").then((r) => {
      setResumes(r.data);
      if (r.data[0] && !resumeId) setResumeId(r.data[0].id);
    }).catch(() => {});
    setResult(letter || null);
    setForm({
      job_title: job?.title || letter?.job_title || "",
      employer: job?.employer || letter?.employer || "",
      job_description: job?.description || "",
    });
    // eslint-disable-next-line
  }, [open, job, letter]);

  async function generate() {
    if (!resumeId) return toast.error("Save a resume first");
    if (!form.job_title.trim()) return toast.error("Add the job title");
    setLoading(true);
    try {
      const { data } = await api.post("/cover-letters/generate", {
        resume_id: resumeId,
        job_title: form.job_title,
        employer: form.employer,
        job_description: form.job_description,
        job_id: job?.job_id || job?.id || null,
        apply_url: job?.apply_url || null,
      });
      setResult(data);
      onSaved?.(data);
      toast.success("Cover letter drafted");
    } catch (e) {
      toast.error(e.response?.data?.detail || "AI request failed");
    } finally { setLoading(false); }
  }

  async function saveEdits() {
    if (!result?.id) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/cover-letters/${result.id}`, { content: result.content });
      setResult(data); onSaved?.(data);
      toast.success("Saved");
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  }

  function copy() {
    navigator.clipboard.writeText(result.content).then(() => toast.success("Copied to clipboard"));
  }

  function download() {
    const blob = new Blob([result.content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Cover Letter - ${(result.title || form.job_title).replace(/[^a-z0-9 -]/gi, "")}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="cover-letter-dialog" className="brutal-border brutal-shadow bg-white rounded-none max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display font-black text-2xl tracking-tighter flex items-center gap-2"><Sparkles size={20} strokeWidth={3} />AI Cover Letter</DialogTitle>
          <DialogDescription>Drafted from your resume and this job. Edit anything before you send it.</DialogDescription>
        </DialogHeader>

        {resumes.length === 0 ? (
          <div data-testid="cover-letter-no-resume" className="brutal-border bg-[#FFD100] p-4 text-sm font-bold">
            You need a saved resume first. <Link to="/resume" className="underline" onClick={() => onOpenChange(false)}>Build one →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label-overline">Resume to use</label>
                <select value={resumeId} onChange={(e) => setResumeId(e.target.value)} data-testid="cover-letter-resume" className={inputCls + " font-bold"}>
                  {resumes.map((r) => <option key={r.id} value={r.id}>{r.title}{r.full_name ? ` — ${r.full_name}` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="label-overline">Job title</label>
                <input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} data-testid="cover-letter-job-title" placeholder="e.g. Library Page" className={inputCls} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label-overline">Employer</label>
                <input value={form.employer} onChange={(e) => setForm({ ...form, employer: e.target.value })} data-testid="cover-letter-employer" placeholder="e.g. Halifax Public Libraries" className={inputCls} />
              </div>
              <div>
                <label className="label-overline">Posting details (optional)</label>
                <input value={form.job_description} onChange={(e) => setForm({ ...form, job_description: e.target.value })} data-testid="cover-letter-description" placeholder="Paste key requirements" className={inputCls} />
              </div>
            </div>
            <button onClick={generate} disabled={loading} data-testid="cover-letter-generate" className="bg-[#FFD100] brutal-border brutal-shadow-sm brutal-press px-4 py-2 font-display font-bold text-sm uppercase inline-flex items-center gap-2 disabled:opacity-60">
              <Sparkles size={14} strokeWidth={3} className={loading ? "animate-spin" : ""} />{loading ? "Writing…" : result ? "Regenerate" : "Write my cover letter"}
            </button>

            {result && (
              <div className="space-y-2">
                <label className="label-overline flex items-center gap-1"><FileText size={12} strokeWidth={3} />Your letter — edit freely</label>
                <textarea
                  value={result.content}
                  onChange={(e) => setResult({ ...result, content: e.target.value })}
                  data-testid="cover-letter-content"
                  rows={14}
                  className="w-full bg-[#FFFCEA] brutal-border px-3 py-2 text-sm leading-relaxed focus:outline-none"
                />
                <div className="flex flex-wrap gap-2">
                  <button onClick={saveEdits} disabled={saving} data-testid="cover-letter-save" className="bg-black text-white brutal-border brutal-press px-3 py-1.5 font-display font-bold text-xs uppercase inline-flex items-center gap-1"><Save size={12} strokeWidth={3} />{saving ? "Saving…" : "Save edits"}</button>
                  <button onClick={copy} data-testid="cover-letter-copy" className="bg-white brutal-border brutal-press px-3 py-1.5 font-display font-bold text-xs uppercase inline-flex items-center gap-1"><Copy size={12} strokeWidth={3} />Copy</button>
                  <button onClick={download} data-testid="cover-letter-download" className="bg-white brutal-border brutal-press px-3 py-1.5 font-display font-bold text-xs uppercase inline-flex items-center gap-1"><Download size={12} strokeWidth={3} />Download .txt</button>
                  {(job?.apply_url || result.apply_url) && (
                    <a href={job?.apply_url || result.apply_url} target="_blank" rel="noreferrer" data-testid="cover-letter-apply" className="ml-auto bg-[#0055A4] text-white brutal-border brutal-press px-3 py-1.5 font-display font-bold text-xs uppercase">Apply now →</a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
