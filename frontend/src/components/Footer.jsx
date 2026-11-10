import { Link } from "react-router-dom";

const EXPLORE = [
  { label: "Programs", to: "/programs" },
  { label: "Jobs", to: "/jobs" },
  { label: "Events", to: "/events" },
  { label: "Local Businesses & Services", to: "/community" },
  { label: "Arts & Creative Communities", to: "/community?category=Arts%20%26%20Creative%20Communities" },
  { label: "Faith & Spiritual Communities", to: "/community?category=Faith%20%26%20Spiritual%20Communities" },
  { label: "Community Resources", to: null }, // page not built yet — intentionally inactive
  { label: "Resume Builder", to: "/resume" },
  { label: "Privacy Policy", to: "/privacy", testId: "footer-privacy-link" },
];

const FEATURED = [
  "Youth Worx (HRM Parks & Recreation)",
  "Black Business Initiative",
  "HRM Youth Leadership Program",
  "YMCA Halifax/Dartmouth",
  "Phoenix Youth · ISANS",
];

export default function Footer() {
  return (
    <footer className="border-t-2 border-black bg-[#0A0A0A] text-white mt-24" data-testid="site-footer">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <img src="/brand/hyh-stacked-dark.webp" alt="Halifax Youth Hub" data-testid="footer-logo" className="h-32 w-auto mb-4 -ml-2" />
          <div data-testid="footer-description" className="text-white/70 max-w-md leading-relaxed space-y-3">
            <p>Discover opportunities and explore your community with Halifax Youth Hub.</p>
            <p>From youth programs, jobs and events to local businesses, creative services, arts, faith communities and community resources, we're making it easier to find what's happening and what's available across Halifax.</p>
            <p>An independent community platform connecting people with the opportunities, services and communities around them.</p>
          </div>
          <p data-testid="footer-disclaimer" className="mt-5 text-xs text-white/50 max-w-md leading-relaxed">
            Halifax Youth Hub is an independent community platform and is not affiliated with or endorsed by the organizations or businesses listed.
          </p>
        </div>
        <div>
          <p className="label-overline mb-3 text-[#FFD100]">Explore</p>
          <ul className="space-y-2 font-display font-semibold" data-testid="footer-explore">
            {EXPLORE.map((item) => (
              <li key={item.label}>
                {item.to ? (
                  <Link to={item.to} data-testid={item.testId} className="hover:text-[#FFD100]">{item.label}</Link>
                ) : (
                  <span data-testid="footer-inactive-community-resources" className="text-white/40 cursor-default" title="Coming soon">{item.label}</span>
                )}
              </li>
            ))}
            <li><a href="/brand/halifax-youth-hub-logo-kit.zip" download data-testid="footer-brand-kit" className="hover:text-[#FFD100]">Logo & Brand Kit</a></li>
          </ul>
        </div>
        <div>
          <p className="label-overline mb-3 text-[#FFD100]">Featured Organizations & Communities</p>
          <ul className="space-y-2 font-display font-semibold text-sm text-white/80" data-testid="footer-featured">
            {FEATURED.map((name) => <li key={name}>{name}</li>)}
          </ul>
        </div>
      </div>
      <div className="border-t-2 border-white/15">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-2 text-xs text-white/60 font-mono-d">
          <span>© {new Date().getFullYear()} Halifax Youth Hub · Mi'kma'ki / Halifax, NS</span>
          <span>Built for the youth of K'jipuktuk.</span>
        </div>
      </div>
    </footer>
  );
}
