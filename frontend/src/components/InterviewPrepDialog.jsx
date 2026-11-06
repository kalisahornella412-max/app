import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { api } from "../lib/api";
import { MessageSquare, ListChecks, Sparkles, Send, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export default function InterviewPrepDialog({ open, onOpenChange, job }) {
  const [tab, setTab] = useState("questions");
  const [prep, setPrep] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [openIdx, setOpenIdx] = useState(0);
  const endRef = useRef(null);

  useEffect(() => {
    if (!open || !job) return;
    setPrep(null); setSession(null); setTab("questions"); setAnswer(""); setOpenIdx(0);
    api.get(`/interview-prep/${encodeURIComponent(job.job_id)}`).then((r) => {
      setPrep(r.data.prep); setSession(r.data.session);
    }).catch(() => {});
  }, [open, job]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [session?.messages?.length, chatLoading]);

  async function generate() {
    setLoading(true);
    try {
      const { data } = await api.post("/interview-prep/questions", { job_id: job.job_id });
      setPrep(data); setOpenIdx(0);
      toast.success("8 practice questions ready");
    } catch (e) { toast.error(e.response?.data?.detail || "AI request failed"); }
    finally { setLoading(false); }
  }

  async function send(message, sessionId = session?.session_id || null) {
    setChatLoading(true);
    if (message) setSession((s) => ({ ...(s || { messages: [] }), messages: [...(s?.messages || []), { role: "user", content: message, at: new Date().toISOString() }] }));
    try {
      const { data } = await api.post("/interview-prep/chat", { job_id: job.job_id, session_id: sessionId, message: message || null });
      setSession(data); setAnswer("");
    } catch (e) {
      toast.error(e.response?.data?.detail || "AI request failed");
      if (message) setSession((s) => s ? { ...s, messages: s.messages.slice(0, -1) } : s);
    } finally { setChatLoading(false); }
  }

  async function restart() {
    const old = session?.session_id;
    setSession(null); setAnswer(""); setChatLoading(true);
    if (old) await api.delete(`/interview-prep/sessions/${old}`).catch(() => {});
    await send(null, null);
  }

  const messages = session?.messages || [];
  const tabCls = (t) => `flex-1 brutal-border px-3 py-2 font-display font-bold text-xs uppercase inline-flex items-center justify-center gap-1 ${tab === t ? "bg-[#FFD100]" : "bg-white hover:bg-[#F4F4F4]"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="interview-prep-dialog" className="brutal-border brutal-shadow bg-white rounded-none max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display font-black text-2xl tracking-tighter flex items-center gap-2"><Sparkles size={20} strokeWidth={3} />Interview Prep Coach</DialogTitle>
          <DialogDescription>{job?.title}{job?.employer ? ` · ${job.employer}` : ""} — tailored to your resume.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <button onClick={() => setTab("questions")} data-testid="prep-tab-questions" className={tabCls("questions")}><ListChecks size={14} strokeWidth={3} />Questions & model answers</button>
          <button onClick={() => setTab("mock")} data-testid="prep-tab-mock" className={tabCls("mock")}><MessageSquare size={14} strokeWidth={3} />Mock interview</button>
        </div>

        {tab === "questions" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm text-black/70">8 likely questions for this role, each with a tip and a sample answer built from your resume.</p>
              <button onClick={generate} disabled={loading} data-testid="prep-generate" className="bg-[#FFD100] brutal-border brutal-shadow-sm brutal-press px-3 py-2 font-display font-bold text-xs uppercase inline-flex items-center gap-1 disabled:opacity-60">
                <Sparkles size={12} strokeWidth={3} className={loading ? "animate-spin" : ""} />{loading ? "Preparing…" : prep ? "Regenerate" : "Generate questions"}
              </button>
            </div>
            {prep?.questions?.map((q, i) => (
              <div key={i} data-testid={`prep-question-${i}`} className="brutal-border bg-[#F4F4F4]">
                <button onClick={() => setOpenIdx(openIdx === i ? -1 : i)} className="w-full text-left p-3 flex items-start justify-between gap-2">
                  <span className="font-display font-bold text-sm"><span className="text-[#0055A4] mr-2">Q{i + 1}</span>{q.question}</span>
                  {openIdx === i ? <ChevronUp size={16} strokeWidth={3} className="shrink-0" /> : <ChevronDown size={16} strokeWidth={3} className="shrink-0" />}
                </button>
                {openIdx === i && (
                  <div className="px-3 pb-3 space-y-2 text-sm">
                    <p className="bg-[#FFD100] brutal-border px-2 py-1 text-xs font-bold">Tip: {q.tip}</p>
                    <p className="bg-white brutal-border px-3 py-2 leading-relaxed"><span className="label-overline block mb-1">Sample answer</span>{q.sample_answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "mock" && (
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="brutal-border bg-[#F4F4F4] p-5 text-center">
                <p className="font-display font-bold">Six questions, one at a time, with feedback after each answer.</p>
                <p className="text-sm text-black/70 mt-1">Type like you'd speak — the coach grades substance, not spelling.</p>
                <button onClick={() => send(null)} disabled={chatLoading} data-testid="mock-start" className="mt-3 bg-[#0055A4] text-white brutal-border brutal-shadow-sm brutal-press px-4 py-2 font-display font-bold text-xs uppercase disabled:opacity-60">{chatLoading ? "Starting…" : "Start mock interview"}</button>
              </div>
            ) : (
              <>
                <div data-testid="mock-transcript" className="brutal-border bg-[#F4F4F4] p-3 max-h-80 overflow-y-auto space-y-2">
                  {messages.map((m, i) => (
                    <div key={i} data-testid={`mock-msg-${m.role}-${i}`} className={`max-w-[88%] brutal-border px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "ml-auto bg-[#FFD100]" : "bg-white"}`}>
                      <span className="label-overline block mb-0.5 text-[9px]">{m.role === "user" ? "You" : "Interviewer"}</span>{m.content}
                    </div>
                  ))}
                  {chatLoading && <div className="bg-white brutal-border px-3 py-2 text-sm w-24 animate-pulse">Thinking…</div>}
                  <div ref={endRef} />
                </div>
                {session?.complete ? (
                  <button onClick={restart} data-testid="mock-restart" className="bg-[#FFD100] brutal-border brutal-press px-3 py-2 font-display font-bold text-xs uppercase inline-flex items-center gap-1"><RotateCcw size={12} strokeWidth={3} />Run it again</button>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); if (answer.trim()) send(answer); }} className="flex gap-2">
                    <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} data-testid="mock-answer" rows={2} maxLength={2000} disabled={chatLoading} placeholder="Type your answer…"
                      className="flex-1 bg-white brutal-border px-3 py-2 text-sm focus:outline-none focus:bg-[#FFFCEA] disabled:opacity-60" />
                    <button type="submit" disabled={chatLoading || !answer.trim()} data-testid="mock-send" className="bg-black text-white brutal-border brutal-press px-3 font-display font-bold text-xs uppercase inline-flex items-center gap-1 disabled:opacity-50"><Send size={12} strokeWidth={3} />Send</button>
                    <button type="button" onClick={restart} title="Restart" data-testid="mock-reset" className="bg-white brutal-border brutal-press px-2"><RotateCcw size={12} strokeWidth={3} /></button>
                  </form>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
