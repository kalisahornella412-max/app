import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAudience } from "../lib/audience";
import { ExternalLink, CalendarClock } from "lucide-react";

const COLOR_MAP = {
  yellow: "bg-[#FFD100] text-black",
  blue: "bg-[#0055A4] text-white",
  white: "bg-white text-black",
  red: "bg-[#FF3B30] text-white",
};

export default function EventFeeds() {
  const { audience } = useAudience();
  const [feeds, setFeeds] = useState([]);

  useEffect(() => {
    api.get(`/event-feeds?audience=${audience}`).then((r) => setFeeds(r.data));
  }, [audience]);

  if (feeds.length === 0) return null;

  return (
    <section data-testid="event-feeds-section" className="border-b-2 border-black bg-[#F4F4F4]">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <span className="label-overline">/ Live event feeds</span>
            <h2 className="font-display font-black tracking-tighter text-3xl sm:text-4xl mt-1">Always-current calendars.</h2>
            <p className="mt-2 text-sm text-black/70 max-w-2xl">
              Direct links to the event boards that update by the minute. Click through to register on the host's site — no middleman.
            </p>
          </div>
          <div className="bg-black text-white brutal-border brutal-shadow-sm px-3 py-1.5 inline-flex items-center gap-2">
            <CalendarClock size={14} strokeWidth={3} />
            <span className="label-overline text-xs">Live calendar</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {feeds.map((f) => (
            <a
              key={f.id}
              href={f.url}
              target="_blank"
              rel="noreferrer"
              data-testid={`event-feed-${f.slug}`}
              className={`brutal-border brutal-shadow brutal-press p-5 flex flex-col group ${COLOR_MAP[f.color] || COLOR_MAP.white}`}
            >
              <span className="label-overline opacity-80 text-xs">{f.publisher}</span>
              <h3 className="font-display font-black text-lg leading-tight mt-1">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed flex-1 opacity-90">{f.description}</p>
              <div className="mt-3 inline-flex items-center gap-2 font-bold text-sm uppercase">
                Open calendar <ExternalLink size={14} strokeWidth={3} className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
