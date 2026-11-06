import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Sparkles, Plus, Trash2, Save, Printer, Lock, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";

const DRAFT_KEY = "hyh_resume_draft";

const TEMPLATES = [
  { id: "classic", name: "Classic", desc: "Clean serif-free, single column" },
  { id: "bold", name: "Bold", desc: "Yellow header band, ATS friendly" },
  { id: "compact", name: "Compact", desc: "Two-column for tight spaces" },
];

const EMPTY = {
  title: "My Resume",
  template: "classic",
  full_name: "",
  headline: "",
  email: "",
  phone: "",
  location: "Halifax, NS",
  summary: "",
  skills: [],
  experience: [],
  education: [],
  projects: [],
};

export default function ResumeBuilderPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [resumes, setResumes] = useState([]);
  const [resume, setResume] = useState(EMPTY);
  const [skillInput, setSkillInput] = useState("");
  const [aiOpenIdx, setAiOpenIdx] = useState(-1);
  const [aiBullets, setAiBullets] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const authed = !!user && user !== false;

  useEffect(() => {
    if (user !== false) return;
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) setResume({ ...EMPTY, ...JSON.parse(draft) });
  }, [user]);

  useEffect(() => {
    if (user !== false) return;
    const touched = ["full_name", "headline", "email", "phone", "summary"].some((k) => resume[k]) ||
      ["skills", "experience", "education"].some((k) => (resume[k] || []).length);
    if (touched) localStorage.setItem(DRAFT_KEY, JSON.stringify(resume));
    else localStorage.removeItem(DRAFT_KEY);
  }, [user, resume]);

  function requireAuth() {
    if (authed) return true;
    setGateOpen(true);
    return false;
  }

  useEffect(() => {
    if (!authed) return;
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      api.post("/resumes", { ...EMPTY, ...JSON.parse(draft) }).then(({ data }) => {
        localStorage.removeItem(DRAFT_KEY);
        setResume({ ...EMPTY, ...data }); setParams({ id: data.id });
        api.get("/resumes").then((r) => setResumes(r.data));
        toast.success("Your draft was saved to your account");
      }).catch(() => toast.error("Couldn't save your draft — try Save again"));
      return;
    }
    api.get("/resumes").then((r) => {
      setResumes(r.data);
      const id = params.get("id");
      if (id) {
        const found = r.data.find((x) => x.id === id);
        if (found) setResume({ ...EMPTY, ...found });
      } else if (r.data.length > 0) {
        setResume({ ...EMPTY, ...r.data[0] });
        setParams({ id: r.data[0].id });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function update(field, value) { setResume((r) => ({ ...r, [field]: value })); }

  function addSkill() {
    if (!skillInput.trim()) return;
    update("skills", [...(resume.skills || []), skillInput.trim()]);
    setSkillInput("");
  }
  function removeSkill(i) {
    update("skills", resume.skills.filter((_, idx) => idx !== i));
  }

  function addExperience() {
    update("experience", [...(resume.experience || []), { role: "", company: "", start: "", end: "", bullets: [""] }]);
  }
  function updateExperience(i, field, value) {
    const next = [...resume.experience]; next[i] = { ...next[i], [field]: value }; update("experience", next);
  }
  function removeExperience(i) { update("experience", resume.experience.filter((_, idx) => idx !== i)); }
  function updateBullet(expIdx, bIdx, value) {
    const next = [...resume.experience]; next[expIdx].bullets[bIdx] = value; update("experience", next);
  }
  function addBullet(expIdx) {
    const next = [...resume.experience]; next[expIdx].bullets = [...(next[expIdx].bullets || []), ""]; update("experience", next);
  }
  function removeBullet(expIdx, bIdx) {
    const next = [...resume.experience]; next[expIdx].bullets.splice(bIdx, 1); update("experience", next);
  }

  function addEducation() {
    update("education", [...(resume.education || []), { school: "", program: "", start: "", end: "" }]);
  }
  function updateEducation(i, field, value) {
    const next = [...resume.education]; next[i] = { ...next[i], [field]: value }; update("education", next);
  }
  function removeEducation(i) { update("education", resume.education.filter((_, idx) => idx !== i)); }

  async function aiSummary() {
    if (!requireAuth()) return;
    setSummaryLoading(true);
    try {
      const { data } = await api.post("/resumes/ai-summary", {
        summary: resume.summary, headline: resume.headline, skills: resume.skills || [],
        roles: (resume.experience || []).map((e) => e.role).filter(Boolean),
      });
      update("summary", data.summary);
      toast.success("Summary polished");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "AI request failed");
    } finally { setSummaryLoading(false); }
  }

  async function aiAssist(expIdx) {
    if (!requireAuth()) return;
    const exp = resume.experience[expIdx];
    setAiOpenIdx(expIdx); setAiLoading(true); setAiBullets([]);
    if (!exp?.role) {
      setAiLoading(false);
      toast.error("Add a role title first to get tailored suggestions");
      return;
    }
    try {
      const { data } = await api.post("/resumes/ai-assist", {
        role: exp.role, company: exp.company, notes: (exp.bullets || []).filter(Boolean).join("\n"),
      });
      setAiBullets(data.bullets || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "AI request failed");
    } finally { setAiLoading(false); }
  }
  function applyBullet(b) {
    const next = [...resume.experience]; next[aiOpenIdx].bullets = [...(next[aiOpenIdx].bullets || []), b]; update("experience", next);
    toast.success("Bullet added");
  }

  async function save() {
    if (!requireAuth()) return;
    setSaving(true);
    try {
      let saved;
      if (resume.id) {
        const { data } = await api.put(`/resumes/${resume.id}`, resume);
        saved = data;
      } else {
        const { data } = await api.post("/resumes", resume);
        saved = data; setParams({ id: data.id });
      }
      setResume({ ...EMPTY, ...saved });
      const list = await api.get("/resumes"); setResumes(list.data);
      toast.success("Saved");
    } catch (e) { toast.error("Save failed"); }
    finally { setSaving(false); }
  }

  function newResume() {
    setResume(EMPTY); setParams({});
  }

  function printPDF() {
    if (!requireAuth()) return;
    window.print();
  }

  return (
    <div data-testid="resume-page" className="bg-white">
      <section className="border-b-2 border-black bg-[#0055A4] text-white print:hidden">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex items-end justify-between flex-wrap gap-4">
          <div>
            <span className="label-overline text-[#FFD100]">/ Resume Builder</span>
            <h1 className="font-display font-black tracking-tighter text-4xl sm:text-5xl mt-1">Build it. Print it. Land it.</h1>
            <p className="mt-2 text-white/85 text-sm max-w-xl">Form-based templates with AI bullet-point suggestions powered by Claude. PDF export via your browser's print → save as PDF.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={newResume} data-testid="resume-new" className="bg-white text-black brutal-border brutal-shadow-sm brutal-press px-3 py-2 font-display font-bold text-sm uppercase inline-flex items-center gap-1"><Plus size={14} strokeWidth={3} />New</button>
            <button onClick={save} disabled={saving} data-testid="resume-save" className="bg-[#FFD100] text-black brutal-border brutal-shadow brutal-press px-3 py-2 font-display font-bold text-sm uppercase inline-flex items-center gap-1 disabled:opacity-60">
              <Save size={14} strokeWidth={3} />{saving ? "Saving…" : "Save"}{!authed && <Lock size={12} strokeWidth={3} />}
            </button>
            <button onClick={printPDF} data-testid="resume-print" className="bg-black text-white brutal-border brutal-shadow brutal-press px-3 py-2 font-display font-bold text-sm uppercase inline-flex items-center gap-1"><Printer size={14} strokeWidth={3} />PDF{!authed && <Lock size={12} strokeWidth={3} />}</button>
          </div>
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid lg:grid-cols-12 gap-6 print:block">
        {/* FORM */}
        <div className="lg:col-span-7 space-y-6 print:hidden">
          {user === false && (
            <div data-testid="resume-guest-banner" className="brutal-border brutal-shadow-sm bg-[#FFD100] p-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold flex items-center gap-2"><Lock size={14} strokeWidth={3} />Start for free. Create an account to use AI help, save and download your resume.</p>
              <Link to="/register?next=/resume" data-testid="resume-guest-register" className="bg-black text-white brutal-border px-3 py-1 font-display font-bold text-xs uppercase">Create account</Link>
            </div>
          )}
          {resumes.length > 0 && (
            <div className="brutal-border brutal-shadow-sm bg-white p-3 flex flex-wrap gap-2 items-center">
              <span className="label-overline">My resumes:</span>
              {resumes.map((r) => (
                <button key={r.id} onClick={() => { setResume({ ...EMPTY, ...r }); setParams({ id: r.id }); }}
                  className={`brutal-border px-2 py-1 text-xs font-bold uppercase ${resume.id === r.id ? "bg-[#FFD100]" : "bg-white"}`}>
                  {r.title}
                </button>
              ))}
            </div>
          )}

          {/* Template + meta */}
          <div className="brutal-border brutal-shadow bg-white p-5 space-y-4">
            <div>
              <label className="label-overline">Template</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {TEMPLATES.map((t) => (
                  <button key={t.id} onClick={() => update("template", t.id)}
                    data-testid={`template-${t.id}`}
                    className={`brutal-border p-3 text-left ${resume.template === t.id ? "bg-[#FFD100] brutal-shadow-sm" : "bg-white"}`}>
                    <div className="font-display font-black">{t.name}</div>
                    <div className="text-xs text-black/70">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <Field label="Resume title" value={resume.title} onChange={(v) => update("title", v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full name" value={resume.full_name} onChange={(v) => update("full_name", v)} />
              <Field label="Headline" value={resume.headline} onChange={(v) => update("headline", v)} />
              <Field label="Email" value={resume.email} onChange={(v) => update("email", v)} />
              <Field label="Phone" value={resume.phone} onChange={(v) => update("phone", v)} />
            </div>
            <Field label="Location" value={resume.location} onChange={(v) => update("location", v)} />
            <div>
              <div className="flex items-center justify-between">
                <label className="label-overline">Summary</label>
                <button onClick={aiSummary} disabled={summaryLoading} data-testid="ai-summary" className="bg-[#0055A4] text-white brutal-border brutal-shadow-sm brutal-press px-2 py-1 font-bold text-xs uppercase inline-flex items-center gap-1 disabled:opacity-60">
                  <Wand2 size={12} strokeWidth={3} />{summaryLoading ? "Writing…" : resume.summary ? "AI polish" : "AI write"}
                </button>
              </div>
              <textarea value={resume.summary} onChange={(e) => update("summary", e.target.value)} rows={3}
                data-testid="resume-summary"
                className="mt-1 w-full bg-white brutal-border px-3 py-2 focus:outline-none focus:bg-[#FFFCEA]" />
            </div>
          </div>

          {/* Skills */}
          <div className="brutal-border brutal-shadow bg-white p-5">
            <h3 className="font-display font-black text-xl">Skills</h3>
            <div className="mt-3 flex gap-2">
              <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                placeholder="e.g. Customer service" data-testid="skill-input"
                className="flex-1 bg-white brutal-border px-3 py-2 focus:outline-none focus:bg-[#FFFCEA]" />
              <button onClick={addSkill} data-testid="skill-add" className="bg-[#FFD100] brutal-border brutal-shadow-sm brutal-press px-4 font-display font-bold uppercase text-sm">Add</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(resume.skills || []).map((s, i) => (
                <span key={i} className="bg-white brutal-border px-2 py-1 text-xs font-bold inline-flex items-center gap-1">
                  {s} <button onClick={() => removeSkill(i)}><Trash2 size={11} strokeWidth={3} /></button>
                </span>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div className="brutal-border brutal-shadow bg-white p-5">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-black text-xl">Experience</h3>
              <button onClick={addExperience} data-testid="experience-add" className="bg-[#FFD100] brutal-border brutal-shadow-sm brutal-press px-3 py-1 font-display font-bold text-xs uppercase">+ Add role</button>
            </div>
            <div className="mt-4 space-y-5">
              {(resume.experience || []).map((exp, i) => (
                <div key={i} className="brutal-border bg-[#F4F4F4] p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Role" value={exp.role} onChange={(v) => updateExperience(i, "role", v)} />
                    <Field label="Company" value={exp.company} onChange={(v) => updateExperience(i, "company", v)} />
                    <Field label="Start" value={exp.start} onChange={(v) => updateExperience(i, "start", v)} placeholder="May 2024" />
                    <Field label="End" value={exp.end} onChange={(v) => updateExperience(i, "end", v)} placeholder="Aug 2024 / Present" />
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <label className="label-overline">Bullet points</label>
                      <button onClick={() => aiAssist(i)} data-testid={`ai-assist-${i}`} className="bg-[#0055A4] text-white brutal-border brutal-shadow-sm brutal-press px-2 py-1 font-bold text-xs uppercase inline-flex items-center gap-1">
                        <Sparkles size={12} strokeWidth={3} />AI assist
                      </button>
                    </div>
                    {(exp.bullets || []).map((b, bi) => (
                      <div key={bi} className="mt-2 flex gap-2">
                        <input value={b} onChange={(e) => updateBullet(i, bi, e.target.value)} placeholder="Describe what you did + impact"
                          className="flex-1 bg-white brutal-border px-3 py-2 text-sm focus:outline-none focus:bg-white" />
                        <button onClick={() => removeBullet(i, bi)} className="bg-white brutal-border px-2"><Trash2 size={12} strokeWidth={3} /></button>
                      </div>
                    ))}
                    <button onClick={() => addBullet(i)} className="mt-2 text-xs font-bold uppercase underline">+ bullet</button>

                    {aiOpenIdx === i && (
                      <div className="mt-3 brutal-border bg-[#FFD100] p-3" data-testid="ai-bullet-popover">
                        <div className="flex items-center justify-between">
                          <p className="label-overline">AI suggestions</p>
                          <button onClick={() => setAiOpenIdx(-1)} className="text-xs font-bold uppercase underline">Close</button>
                        </div>
                        {aiLoading ? <p className="text-sm mt-2" data-testid="ai-loading">Thinking…</p> : (
                          <ul className="mt-2 space-y-2" data-testid="ai-bullet-list">
                            {aiBullets.map((b, j) => (
                              <li key={j} data-testid={`ai-bullet-${j}`} className="flex gap-2 items-start">
                                <span className="flex-1 text-sm">{b}</span>
                                <button onClick={() => applyBullet(b)} data-testid={`ai-bullet-${j}-add`} className="bg-black text-white brutal-border brutal-shadow-sm px-2 py-0.5 text-xs font-bold uppercase">Add</button>
                              </li>
                            ))}
                            {aiBullets.length === 0 && <li className="text-sm" data-testid="ai-bullet-empty">No suggestions returned. Try adding a role + notes.</li>}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={() => removeExperience(i)} className="mt-3 text-xs font-bold uppercase text-[#FF3B30] underline">Remove role</button>
                </div>
              ))}
              {(!resume.experience || resume.experience.length === 0) && <p className="text-sm text-black/60">No roles yet.</p>}
            </div>
          </div>

          {/* Education */}
          <div className="brutal-border brutal-shadow bg-white p-5">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-black text-xl">Education</h3>
              <button onClick={addEducation} data-testid="edu-add" className="bg-[#FFD100] brutal-border brutal-shadow-sm brutal-press px-3 py-1 font-display font-bold text-xs uppercase">+ Add school</button>
            </div>
            <div className="mt-4 space-y-4">
              {(resume.education || []).map((ed, i) => (
                <div key={i} className="brutal-border bg-[#F4F4F4] p-4 grid grid-cols-2 gap-3">
                  <Field label="School" value={ed.school} onChange={(v) => updateEducation(i, "school", v)} />
                  <Field label="Program" value={ed.program} onChange={(v) => updateEducation(i, "program", v)} />
                  <Field label="Start" value={ed.start} onChange={(v) => updateEducation(i, "start", v)} />
                  <Field label="End" value={ed.end} onChange={(v) => updateEducation(i, "end", v)} />
                  <button onClick={() => removeEducation(i)} className="col-span-2 text-xs font-bold uppercase text-[#FF3B30] underline text-left">Remove</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PREVIEW */}
        <div className="lg:col-span-5 print:col-span-12">
          <div className="lg:sticky lg:top-24">
            <span className="label-overline print:hidden">Live preview</span>
            <ResumePreview resume={resume} />
          </div>
        </div>
      </section>
      <SignupGate open={gateOpen} onOpenChange={setGateOpen} />
    </div>
  );
}

function SignupGate({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="resume-signup-gate" className="brutal-border brutal-shadow bg-white rounded-none">
        <DialogHeader>
          <DialogTitle className="font-display font-black text-2xl tracking-tighter">Create a free account to finish</DialogTitle>
          <DialogDescription>Your draft is kept on this device. Sign up to use AI help, save your resume and download it as a PDF.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 mt-2">
          <Link to="/register?next=/resume" data-testid="gate-register" className="bg-[#FFD100] text-black brutal-border brutal-shadow-sm brutal-press px-4 py-2 font-display font-bold text-sm uppercase">Create account</Link>
          <Link to="/login?next=/resume" data-testid="gate-login" className="bg-white text-black brutal-border px-4 py-2 font-display font-bold text-sm uppercase">Sign in</Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="label-overline">{label}</label>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full bg-white brutal-border px-3 py-2 focus:outline-none focus:bg-[#FFFCEA]" />
    </div>
  );
}

function ResumePreview({ resume }) {
  const t = resume.template;
  return (
    <div data-testid="resume-preview" className="brutal-border brutal-shadow bg-white p-8 print:p-12 print:shadow-none print:border-0 min-h-[600px] text-sm">
      {t === "bold" && (
        <div className="-mx-8 -mt-8 mb-6 px-8 py-5 bg-[#FFD100] border-b-2 border-black print:-mx-12 print:-mt-12 print:px-12">
          <h1 className="font-display font-black text-3xl tracking-tighter">{resume.full_name || "Your Name"}</h1>
          <p className="font-display font-bold">{resume.headline}</p>
        </div>
      )}
      {t !== "bold" && (
        <>
          <h1 className="font-display font-black text-3xl tracking-tighter">{resume.full_name || "Your Name"}</h1>
          {resume.headline && <p className="font-display font-bold mt-1">{resume.headline}</p>}
        </>
      )}
      <p className="text-xs text-black/70 mt-1">{[resume.email, resume.phone, resume.location].filter(Boolean).join(" · ")}</p>
      {resume.summary && (
        <section className="mt-5">
          <h2 className="label-overline border-b-2 border-black pb-1 mb-2">Summary</h2>
          <p className="leading-relaxed">{resume.summary}</p>
        </section>
      )}
      <div className={t === "compact" ? "mt-4 grid grid-cols-3 gap-4" : "mt-4"}>
        {(resume.skills || []).length > 0 && (
          <section className={t === "compact" ? "col-span-1" : ""}>
            <h2 className="label-overline border-b-2 border-black pb-1 mb-2 mt-4">Skills</h2>
            <div className="flex flex-wrap gap-1">
              {resume.skills.map((s, i) => <span key={i} className="bg-[#F4F4F4] brutal-border text-xs px-2 py-0.5">{s}</span>)}
            </div>
          </section>
        )}
        <div className={t === "compact" ? "col-span-2" : ""}>
          {(resume.experience || []).length > 0 && (
            <section className="mt-4">
              <h2 className="label-overline border-b-2 border-black pb-1 mb-2">Experience</h2>
              {resume.experience.map((e, i) => (
                <div key={i} className="mb-3">
                  <div className="flex justify-between gap-2"><p className="font-display font-bold">{e.role || "Role"} · {e.company}</p><p className="text-xs text-black/70 whitespace-nowrap">{e.start} – {e.end}</p></div>
                  <ul className="list-disc ml-5 mt-1 space-y-0.5">
                    {(e.bullets || []).filter(Boolean).map((b, bi) => <li key={bi}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </section>
          )}
          {(resume.education || []).length > 0 && (
            <section className="mt-4">
              <h2 className="label-overline border-b-2 border-black pb-1 mb-2">Education</h2>
              {resume.education.map((e, i) => (
                <div key={i} className="mb-2 flex justify-between gap-2">
                  <div><p className="font-display font-bold">{e.school}</p><p className="text-xs">{e.program}</p></div>
                  <p className="text-xs text-black/70 whitespace-nowrap">{e.start} – {e.end}</p>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
