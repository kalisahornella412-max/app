import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useAudience } from "../lib/audience";
import { Calendar as CalIcon, MapPin, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function EventsPage() {
  const { user } = useAuth();
  const { audience } = useAudience();
  const [events, setEvents] = useState([]);
  const [rsvps, setRsvps] = useState(new Set());

  useEffect(() => {
    api.get(`/events?audience=${audience}`).then((r) => setEvents(r.data));
  }, [audience]);

  useEffect(() => {
    if (user && user !== false) {
      api.get("/me/rsvps").then((r) => setRsvps(new Set(r.data.map((x) => x.event_id)))).catch(() => {});
    }
  }, [user]);

  async function toggleRsvp(id) {
    if (!user || user === false) return toast.error("Sign in to RSVP");
    if (rsvps.has(id)) {
      await api.delete(`/events/${id}/rsvp`);
      setRsvps((s) => { const n = new Set(s); n.delete(id); return n; });
      toast.success("RSVP removed");
    } else {
      await api.post(`/events/${id}/rsvp`);
      setRsvps((s) => new Set(s).add(id));
      toast.success("You're on the list 🎟️");
    }
  }

  return (
    <div data-testid="events-page" className="bg-white">
      <section className="border-b-2 border-black bg-[#FFD100]">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <span className="label-overline">/ Events · {audience === "immigrant" ? "Newcomers" : "Youth"}</span>
          <h1 className="font-display font-black tracking-tighter text-5xl sm:text-6xl mt-2">
            {audience === "immigrant" ? "Workshops for newcomers." : "Workshops & Events."}
          </h1>
          <p className="mt-3 max-w-xl text-black/80">
            {audience === "immigrant"
              ? "Resume clinics, welcome nights, and Canadian-style interview prep with multilingual support."
              : "Free skill-ups, pitch nights, job fairs and mixers — RSVP to save your spot."}
          </p>
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-5">
          {events.map((e) => {
            const date = new Date(e.starts_at);
            const isRsvped = rsvps.has(e.id);
            return (
              <div key={e.id} data-testid={`event-card-${e.id}`} className="brutal-border brutal-shadow bg-white grid md:grid-cols-12 overflow-hidden">
                <div className="md:col-span-3 bg-black text-white p-5 flex flex-col items-center justify-center border-r-2 border-black">
                  <span className="label-overline text-[#FFD100]">{date.toLocaleString("en-CA", { month: "short" })}</span>
                  <span className="font-display font-black text-5xl leading-none mt-1">{date.getDate()}</span>
                  <span className="font-mono-d text-xs mt-1">{date.toLocaleString("en-CA", { weekday: "short" })}</span>
                </div>
                <div className="md:col-span-9 p-5 flex flex-col">
                  <span className="label-overline text-[#0055A4]">{e.category}</span>
                  <h3 className="font-display font-black text-xl mt-1 leading-tight">{e.title}</h3>
                  <p className="font-display font-bold text-black/70 text-sm mt-1">{e.host}</p>
                  <p className="mt-2 text-sm text-black/75 line-clamp-2">{e.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="bg-white brutal-border px-2 py-0.5 inline-flex items-center gap-1"><MapPin size={12} strokeWidth={3} />{e.location}</span>
                    <span className="bg-white brutal-border px-2 py-0.5 inline-flex items-center gap-1"><CalIcon size={12} strokeWidth={3} />{date.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })} · {e.duration_minutes}min</span>
                  </div>
                  <button
                    onClick={() => toggleRsvp(e.id)}
                    data-testid={`rsvp-btn-${e.id}`}
                    className={`mt-4 self-start brutal-border brutal-shadow-sm brutal-press px-4 py-2 font-display font-bold uppercase text-sm inline-flex items-center gap-2 ${isRsvped ? "bg-[#0055A4] text-white" : "bg-[#FFD100]"}`}
                  >
                    {isRsvped ? (<><CheckCircle2 size={14} strokeWidth={3} /> RSVPed</>) : "RSVP free"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
