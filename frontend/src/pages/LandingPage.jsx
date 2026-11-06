import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAudience } from "../lib/audience";
import { ArrowRight, Briefcase, FileText, Calendar, Sparkles, MapPin } from "lucide-react";

const partners = [
  "YOUTH WORX", "BBI", "HRM YOUTH LEADERSHIP", "YMCA HALIFAX", "PHOENIX YOUTH",
  "ISANS", "YREACH NEWCOMER", "YWCA READY 4 LAUNCH", "JOB JUNCTION",
  "NS WORKS", "CANADA SUMMER JOBS", "FSWEP",
];

export default function LandingPage() {
  const { audience } = useAudience();
  const [programs, setPrograms] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({ programs: 0, jobs: 0, events: 0 });
  const [liveCount, setLiveCount] = useState(null);

  useEffect(() => {
    api.get(`/programs?featured=true&audience=${audience}`).then((r) => setPrograms(r.data.slice(0, 4))).catch(() => {});
    api.get(`/jobs?audience=${audience}`).then((r) => setJobs(r.data.slice(0, 3))).catch(() => {});
    api.get("/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get(`/live-jobs?audience=${audience}&limit=100`).then((r) => setLiveCount(r.data.jobs.length)).catch(() => setLiveCount(0));
  }, [audience]);

  const isNewcomer = audience === "immigrant";

  return (
    <div data-testid="landing-page" className="bg-white">
      {/* HERO */}
      <section className="border-b-2 border-black relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-50 pointer-events-none" />
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 relative">
          <div className="grid lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 bg-[#FFD100] brutal-border brutal-shadow-sm px-3 py-1 mb-6">
                <span className="w-2 h-2 bg-[#FF3B30] rounded-full animate-pulse" />
                <span className="label-overline">{isNewcomer ? "For Newcomers · Halifax" : "Built in K'jipuktuk · Halifax"}</span>
              </div>
              <h1 className="font-display font-black tracking-tighter text-5xl sm:text-6xl lg:text-7xl leading-[0.95]">
                {isNewcomer ? (
                  <>Halifax, made navigable.<br /><span className="bg-[#FFD100] px-2 inline-block brutal-border brutal-shadow">For newcomers.</span></>
                ) : (
                  <>Every Halifax youth program.<br /><span className="bg-[#FFD100] px-2 inline-block brutal-border brutal-shadow">One door.</span></>
                )}
              </h1>
              <p className="mt-6 text-lg max-w-xl text-black/75 leading-relaxed">
                {isNewcomer
                  ? "Settlement, language support, employment readiness, newcomer-friendly jobs and resume help — with listings from ISANS, YREACH, YMCA, YWCA and more, all in one place."
                  : "Find paid jobs, mentorship and free workshops from programs like Youth Worx, BBI, HRM Youth Leadership, YMCA & more — plus an AI-assisted resume builder so you actually get the job."}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/programs"
                  data-testid="cta-explore-programs"
                  className="bg-[#FFD100] brutal-border brutal-shadow brutal-press inline-flex items-center gap-2 px-6 py-3 font-display font-bold uppercase tracking-wide"
                >
                  Explore programs <ArrowRight size={18} strokeWidth={3} />
                </Link>
                <Link
                  to="/resume"
                  data-testid="cta-build-resume"
                  className="bg-[#0055A4] text-white brutal-border brutal-shadow brutal-press inline-flex items-center gap-2 px-6 py-3 font-display font-bold uppercase tracking-wide"
                >
                  Build my resume <Sparkles size={18} strokeWidth={3} />
                </Link>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-3 max-w-lg">
                {[
                  { n: stats.programs, l: "Programs" },
                  { n: stats.jobs, l: "Open Jobs" },
                  { n: stats.events, l: "Events" },
                ].map((s, i) => (
                  <div key={i} className="brutal-border brutal-shadow-sm bg-white p-4">
                    <div className="font-display font-black text-3xl">{s.n}</div>
                    <div className="label-overline mt-1">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              <div className="aspect-[3/4] brutal-border brutal-shadow-lg bg-[#0055A4] overflow-hidden col-span-1">
                <img
                  src="https://images.unsplash.com/photo-1758270705172-07b53627dfcb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2ODh8MHwxfHNlYXJjaHwzfHx5b3VuZyUyMHBlb3BsZSUyMHdvcmtpbmclMjBvbiUyMGxhcHRvcHN8ZW58MHx8fHwxNzc4MTI1MzI1fDA&ixlib=rb-4.1.0&q=85"
                  alt="Halifax youth working" loading="eager"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="grid gap-3">
                <div className="aspect-square brutal-border brutal-shadow bg-[#FFD100] p-4 flex flex-col justify-between">
                  <span className="label-overline">Live · Job Bank Canada</span>
                  <div>
                    <div data-testid="hero-live-jobs-count" className="font-display font-black text-2xl leading-none">{liveCount === null ? "…" : liveCount}</div>
                    <div className="text-xs font-bold mt-1">Halifax openings on jobbank.gc.ca right now</div>
                  </div>
                </div>
                <div className="aspect-square brutal-border brutal-shadow overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1571391756721-0e5caf1d8f80?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzB8MHwxfHNlYXJjaHwzfHxkaXZlcnNlJTIweW91dGglMjB3b3Jrc2hvcHxlbnwwfHx8fDE3NzgxMjUzMDJ8MA&ixlib=rb-4.1.0&q=85"
                    alt="Youth collaboration" className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE PARTNERS */}
      <section className="bg-[#0A0A0A] text-white border-b-2 border-black overflow-hidden">
        <div className="py-5 flex whitespace-nowrap marquee-track">
          {[...partners, ...partners].map((p, i) => (
            <span key={i} className="font-display font-black text-2xl tracking-tighter px-6 flex items-center">
              {p} <span className="ml-6 text-[#FFD100]">★</span>
            </span>
          ))}
        </div>
      </section>

      {/* WHAT YOU CAN DO */}
      <section className="border-b-2 border-black bg-[#F4F4F4]">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <span className="label-overline">/01 What you get</span>
              <h2 className="font-display font-black tracking-tighter text-4xl sm:text-5xl mt-2">Four ways to level up.</h2>
            </div>
            <p className="max-w-md text-black/70">No more 12 tabs, sketchy PDFs and 'ask the school counsellor'. Every door under one roof.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Briefcase, title: "Programs Directory", desc: "Filter by age, neighbourhood, category. Links straight to each program's official application page.", to: "/programs", bg: "bg-[#FFD100]" },
              { icon: MapPin, title: "Halifax Job Board", desc: "Curated jobs that hire 15–30 year-olds. With deadlines & wages up front.", to: "/jobs", bg: "bg-white" },
              { icon: FileText, title: "Resume Builder", desc: "Form-based templates + AI bullet-point assistant. Export PDF in one click.", to: "/resume", bg: "bg-[#0055A4] text-white" },
              { icon: Calendar, title: "Events & Workshops", desc: "Pitch nights, job fairs, free skill-ups. RSVP and we'll remember.", to: "/events", bg: "bg-white" },
            ].map((f, i) => (
              <Link
                key={i} to={f.to}
                data-testid={`feature-card-${i}`}
                className={`${f.bg} brutal-border brutal-shadow brutal-press p-6 group flex flex-col h-full`}
              >
                <f.icon size={32} strokeWidth={3} />
                <h3 className="font-display font-black text-xl mt-4 tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed flex-1">{f.desc}</p>
                <div className="mt-4 inline-flex items-center gap-2 font-bold text-sm uppercase">
                  Open <ArrowRight size={14} strokeWidth={3} className="transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PROGRAMS */}
      <section className="border-b-2 border-black bg-white">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <span className="label-overline">/02 Featured</span>
              <h2 className="font-display font-black tracking-tighter text-4xl sm:text-5xl mt-2">Programs hiring & enrolling now.</h2>
            </div>
            <Link to="/programs" className="bg-white brutal-border brutal-shadow-sm brutal-press px-4 py-2 font-display font-bold uppercase text-sm">
              View all →
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {programs.map((p) => (
              <Link
                key={p.id} to={`/programs/${p.id}`}
                data-testid={`featured-program-${p.slug}`}
                className="brutal-border brutal-shadow brutal-press bg-white flex flex-col"
              >
                <div className="aspect-[4/3] border-b-2 border-black overflow-hidden bg-[#F4F4F4]">
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <span className="label-overline text-[#0055A4]">{p.category}</span>
                  <h3 className="font-display font-black text-lg leading-tight mt-1.5">{p.name}</h3>
                  <p className="mt-2 text-sm text-black/70 line-clamp-3">{p.short_description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="text-xs font-bold bg-[#FFD100] brutal-border px-2 py-0.5">Ages {p.age_min}–{p.age_max}</span>
                    <span className="text-xs font-bold bg-white brutal-border px-2 py-0.5">{p.neighbourhood}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* RECENT JOBS */}
      <section className="border-b-2 border-black bg-[#0055A4] text-white">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <span className="label-overline text-[#FFD100]">/03 Spotlight roles</span>
              <h2 className="font-display font-black tracking-tighter text-4xl sm:text-5xl mt-2">Hand-picked openings.</h2>
              <p className="mt-2 text-sm text-white/80 max-w-xl">Curated from employers' public careers pages, with closing dates shown. The full live Job Bank feed is on the Jobs page.</p>
            </div>
            <Link to="/jobs" className="bg-[#FFD100] text-black brutal-border brutal-shadow brutal-press px-4 py-2 font-display font-bold uppercase text-sm">
              View all jobs →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {jobs.map((j) => (
              <a
                key={j.id} href={j.apply_url || "#"} target="_blank" rel="noreferrer"
                data-testid={`featured-job-${j.id}`}
                className="bg-white text-black brutal-border brutal-shadow brutal-press p-5 flex flex-col"
              >
                <span className="label-overline text-[#FF3B30]">{j.category}</span>
                <h3 className="font-display font-black text-xl mt-1 leading-tight">{j.title}</h3>
                <p className="mt-1 text-sm font-bold">{j.employer} · {j.location}</p>
                <p className="mt-3 text-sm text-black/70 line-clamp-2">{j.short_description}</p>
                <div className="mt-4 flex items-center justify-between border-t-2 border-black pt-3">
                  <span className="font-display font-black text-lg">{j.wage}</span>
                  <span className="label-overline">{j.type}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#FFD100] border-b-2 border-black">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="label-overline">/04 Free to use</span>
            <h2 className="font-display font-black tracking-tighter text-4xl sm:text-5xl mt-2 leading-[0.95]">
              Make a profile.<br />Save what you love.<br />Apply with one click.
            </h2>
            <p className="mt-4 max-w-md text-black/80">
              Sign up free. Track your applications, save programs, and get an AI-assisted resume that lands interviews.
            </p>
            <div className="mt-6 flex gap-3">
              <Link to="/register" data-testid="cta-signup" className="bg-black text-white brutal-border brutal-shadow brutal-press px-6 py-3 font-display font-bold uppercase">
                Create free account
              </Link>
              <Link to="/programs" className="bg-white brutal-border brutal-shadow brutal-press px-6 py-3 font-display font-bold uppercase">
                Browse first
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -top-2 -left-2 right-2 bottom-2 brutal-border bg-[#FF3B30]" />
            <div className="relative brutal-border brutal-shadow-lg overflow-hidden aspect-[4/3]">
              <img src="https://images.unsplash.com/photo-1691346116650-4afd53ea62f5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwyfHxoYWxpZmF4JTIwbm92YSUyMHNjb3RpYXxlbnwwfHx8fDE3NzgxMjUzMDJ8MA&ixlib=rb-4.1.0&q=85" alt="Halifax" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
