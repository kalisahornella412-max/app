import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAudience } from "../lib/audience";
import { CalendarDays, MapPin, ExternalLink } from "lucide-react";
import EventFeeds from "../components/EventFeeds";

export default function EventsPage() {
  const { audience } = useAudience();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.get(`/events?audience=${audience}`).then((r) => setEvents(r.data));
  }, [audience]);

  return (
    <div data-testid="events-page" className="bg-white">
      <section className="border-b-2 border-black bg-[#FFD100]">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <span className="label-overline">/ Events · {audience === "immigrant" ? "Newcomers" : "Youth"}</span>
          <h1 className="font-display font-black tracking-tighter text-5xl sm:text-6xl mt-2">
            {audience === "immigrant" ? "Real workshops & career fairs." : "Real workshops & events."}
          </h1>
          <p className="mt-3 max-w-xl text-black/80">
            Live calendars from ISANS, YMCA, YWCA, libraries & more — and recurring programs that always have a next intake. Click through to the host to see exact dates and register.
          </p>
        </div>
      </section>

      <EventFeeds />

      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <span className="label-overline">/ Recurring programs</span>
            <h2 className="font-display font-black tracking-tighter text-3xl sm:text-4xl mt-1">Open intakes & ongoing series.</h2>
            <p className="mt-2 text-sm text-black/70 max-w-xl">
              Programs that take new applicants on a rolling basis or run regular cohorts. Click any card to view the host's page and apply.
            </p>
          </div>
          <p className="font-mono-d text-sm">{events.length} listing{events.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {events.map((e) => (
            <a
              key={e.id}
              href={e.host_url || "#"}
              target="_blank"
              rel="noreferrer"
              data-testid={`event-card-${e.slug || e.id}`}
              className="brutal-border brutal-shadow brutal-press bg-white grid md:grid-cols-12 overflow-hidden group"
            >
              <div className="md:col-span-3 bg-black text-white p-5 flex flex-col items-center justify-center border-r-2 border-black">
                <CalendarDays size={28} strokeWidth={2.5} className="text-[#FFD100]" />
                <span className="label-overline mt-2 text-center text-[10px] leading-tight">{e.starts_at || "Rolling"}</span>
              </div>
              <div className="md:col-span-9 p-5 flex flex-col">
                <span className="label-overline text-[#0055A4]">{e.category}</span>
                <h3 className="font-display font-black text-xl mt-1 leading-tight">{e.title}</h3>
                <p className="font-display font-bold text-black/70 text-sm mt-1">{e.host}</p>
                <p className="mt-2 text-sm text-black/75 line-clamp-3">{e.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="bg-white brutal-border px-2 py-0.5 inline-flex items-center gap-1">
                    <MapPin size={12} strokeWidth={3} />{e.location}
                  </span>
                  {e.source_checked && (
                    <span data-testid={`event-checked-${e.slug}`} className="bg-[#F4F4F4] brutal-border px-2 py-0.5 text-black/70">Details checked {e.source_checked}</span>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t-2 border-black flex items-center justify-between">
                  <span className="font-display font-bold uppercase text-sm">View on host site</span>
                  <ExternalLink size={16} strokeWidth={3} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
