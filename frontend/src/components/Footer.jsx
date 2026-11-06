import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t-2 border-black bg-[#0A0A0A] text-white mt-24" data-testid="site-footer">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <img src="/brand/hyh-stacked-dark.webp" alt="Halifax Youth Hub" data-testid="footer-logo" className="h-32 w-auto mb-4 -ml-2" />
          <p className="text-white/70 max-w-md leading-relaxed">
            One door to Halifax programs, jobs, mentors and events built for youth and newcomers.
            An independent community directory — every listing links to the organization's official page.
            Halifax Youth Hub is not affiliated with or endorsed by the organizations listed.
          </p>
        </div>
        <div>
          <p className="label-overline mb-3 text-[#FFD100]">Explore</p>
          <ul className="space-y-2 font-display font-semibold">
            <li><Link to="/programs" className="hover:text-[#FFD100]">Programs</Link></li>
            <li><Link to="/jobs" className="hover:text-[#FFD100]">Jobs</Link></li>
            <li><Link to="/events" className="hover:text-[#FFD100]">Events</Link></li>
            <li><Link to="/resume" className="hover:text-[#FFD100]">Resume Builder</Link></li>
            <li><Link to="/privacy" data-testid="footer-privacy-link" className="hover:text-[#FFD100]">Privacy Policy</Link></li>
          </ul>
        </div>
        <div>
          <p className="label-overline mb-3 text-[#FFD100]">Programs we list</p>
          <ul className="space-y-2 font-display font-semibold text-sm text-white/80">
            <li>Youth Worx (HRM Parks & Recreation)</li>
            <li>Black Business Initiative</li>
            <li>HRM Youth Leadership Program</li>
            <li>YMCA Halifax/Dartmouth</li>
            <li>Phoenix Youth · ISANS</li>
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
