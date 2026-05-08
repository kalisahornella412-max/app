import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAudience } from "../lib/audience";
import { ExternalLink, Building2, MapPin, CalendarClock, RefreshCw, AlertTriangle } from "lucide-react";

const formatRelative = (raw) => {
  if (!raw) return "";
  // Job Bank gives e.g. "May 07, 2026"
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  const days = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return raw;
};

export default function LiveJobs() {
  const { audience } = useAudience();
  const [data, setData] = useState({ jobs: [], fetched_at: null, cached: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/live-jobs?audience=${audience}&limit=18`);
      setData(data);
      if (data.error && data.jobs.length === 0) setError(data.error);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [audience]);

  const fetched = data.fetched_at ? new Date(data.fetched_at).toLocaleString("en-CA", {
    hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short",
  }) : null;

  return (
    <section data-testid="live-jobs-section" className="border-b-2 border-black bg-white">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-2">
          <div>
            <span className="label-overline text-[#FF3B30]">/ Live · Job Bank Canada</span>
            <h2 className="font-display font-black tracking-tighter text-3xl sm:text-4xl mt-1">
              Real Halifax openings.
            </h2>
            <p className="mt-2 text-sm text-black/70 max-w-2xl">
              Pulled directly from <a href="https://www.jobbank.gc.ca" target="_blank" rel="noreferrer" className="underline font-bold">jobbank.gc.ca</a> every 30 minutes — Halifax HRM only. Click any role to apply on Job Bank.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {fetched && (
              <div className="bg-black text-white brutal-border brutal-shadow-sm px-3 py-1.5 inline-flex items-center gap-2">
                <CalendarClock size={12} strokeWidth={3} />
                <span className="label-overline text-[10px]">Updated {fetched}</span>
              </div>
            )}
            <button
              onClick={load}
              disabled={loading}
              data-testid="live-jobs-refresh"
              className="bg-[#FFD100] brutal-border brutal-shadow-sm brutal-press p-2 disabled:opacity-50"
              aria-label="refresh"
            >
              <RefreshCw size={14} strokeWidth={3} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {data.stale && (
          <div className="mb-4 brutal-border bg-[#FFD100] p-3 inline-flex items-center gap-2 text-sm font-bold">
            <AlertTriangle size={14} strokeWidth={3} />
            Showing last successful pull — Job Bank may be temporarily unreachable.
          </div>
        )}

        {error && data.jobs.length === 0 && (
          <div className="brutal-border bg-[#F4F4F4] p-6 text-center" data-testid="live-jobs-error">
            <AlertTriangle size={20} strokeWidth={3} className="mx-auto" />
            <p className="mt-2 font-display font-bold">Couldn't reach Job Bank just now.</p>
            <p className="text-sm text-black/70 mt-1">Try the refresh button or browse the live feeds below.</p>
          </div>
        )}

        {loading && data.jobs.length === 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="live-jobs-skeleton">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="brutal-border bg-[#F4F4F4] p-5 h-48 animate-pulse" />
            ))}
          </div>
        )}

        {data.jobs.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {data.jobs.map((j) => (
              <a
                key={j.id}
                href={j.apply_url}
                target="_blank"
                rel="noreferrer"
                data-testid={`live-job-${j.id}`}
                className="brutal-border brutal-shadow brutal-press bg-white p-5 flex flex-col group"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="label-overline text-[#0055A4]">{j.posted_at ? formatRelative(j.posted_at) : "Live"}</span>
                  <span className="bg-[#FFD100] brutal-border px-2 py-0.5 font-display font-black text-[10px] uppercase">{j.source}</span>
                </div>
                <h3 className="font-display font-black text-lg leading-tight mt-1 capitalize">{j.title}</h3>
                <div className="mt-2 space-y-1 text-xs font-bold flex-1">
                  {j.employer && (
                    <div className="inline-flex items-center gap-1 max-w-full">
                      <Building2 size={12} strokeWidth={3} className="shrink-0" />
                      <span className="truncate">{j.employer}</span>
                    </div>
                  )}
                  <div className="inline-flex items-center gap-1">
                    <MapPin size={12} strokeWidth={3} />
                    <span>{j.location}</span>
                  </div>
                  {j.wage && (
                    <div className="font-display font-black text-base text-black mt-1">{j.wage}</div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t-2 border-black flex items-center justify-between">
                  <span className="font-display font-bold uppercase text-xs">View on Job Bank</span>
                  <ExternalLink size={14} strokeWidth={3} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
