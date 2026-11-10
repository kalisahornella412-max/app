import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import BackButton from "../components/BackButton";

const UPDATED = "November 6, 2026";
const CONTACT = "kalisahornella412@gmail.com";

const sections = [
  {
    h: "Who we are",
    p: [
      "Halifax Youth Hub is an independent community directory for young people (roughly ages 15–30) and newcomers in the Halifax Regional Municipality. We list programs, jobs and events run by other organizations and link to their official pages. We are not affiliated with, and are not endorsed by, any organization we list.",
    ],
  },
  {
    h: "What we collect",
    list: [
      "Account details: your name, email address and a password. Passwords are stored only as a one-way bcrypt hash — we cannot read them.",
      "Things you create: resumes, cover letters, saved jobs and programs, application statuses (Saved / Applied / Interviewed / Hired) and event RSVPs.",
      "Technical basics needed to keep you signed in: a secure, httpOnly session cookie. We do not run advertising trackers or third-party analytics.",
    ],
  },
  {
    h: "How we use it",
    list: [
      "To run your account and show you your own dashboard, resumes and saved items.",
      "To send you transactional email you asked for — for example the daily reminder about saved jobs that close within 7 days. You can turn reminders off on your dashboard at any time, and we never send marketing email.",
      "AI features: when you use \"AI help\" in the resume builder or the cover-letter writer, the text in that resume and the job you selected is sent to an AI model (Anthropic Claude, routed through our hosting provider Emergent) to generate a draft. That content is used only to produce your draft and is not used to train models.",
    ],
  },
  {
    h: "How it is stored and protected",
    list: [
      "Data is stored in a MongoDB database managed by our hosting provider, Emergent, and is encrypted in transit (HTTPS) between your browser and our servers.",
      "Access to the database is limited to the application and the site administrator. We do not sell, rent or share your personal information with the organizations we list or with anyone else, except service providers that process it on our behalf (hosting, email delivery, AI generation).",
      "Links to Job Bank, employers and program websites take you to third-party sites with their own privacy practices.",
    ],
  },
  {
    h: "Young people",
    p: [
      "This site is designed for youth. If you are under 16, please involve a parent or guardian before creating an account, and only enter the information needed to build your resume. We do not knowingly collect more than we need, and we will delete an account on request from a young person or their guardian.",
    ],
  },
  {
    h: "Your choices",
    list: [
      "Edit or delete any resume, cover letter or saved item from your dashboard.",
      "Turn email reminders on or off from your dashboard.",
      "Delete your account and all of its data permanently from the dashboard (\"Delete my account\"). Deletion is immediate and cannot be undone.",
    ],
  },
  {
    h: "Changes & contact",
    p: [
      `This policy was last updated on ${UPDATED}. If we change how we handle your data we will update this page.`,
    ],
    contact: true,
  },
];

export default function PrivacyPage() {
  return (
    <div data-testid="privacy-page" className="bg-white">
      <section className="border-b-2 border-black bg-[#F4F4F4]">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <BackButton />
          <span className="label-overline">/ Privacy</span>
          <h1 className="font-display font-black tracking-tighter text-4xl sm:text-5xl lg:text-6xl mt-2 flex items-center gap-3"><ShieldCheck size={40} strokeWidth={3} />Privacy Policy</h1>
          <p className="mt-3 text-black/75 max-w-2xl">Plain-language summary of what Halifax Youth Hub collects, why, and how you stay in control. Last updated {UPDATED}.</p>
        </div>
      </section>
      <section className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {sections.map((s) => (
          <div key={s.h} className="brutal-border brutal-shadow-sm bg-white p-6">
            <h2 className="font-display font-black text-base md:text-lg">{s.h}</h2>
            {s.p?.map((t, i) => <p key={i} className="mt-2 text-sm leading-relaxed text-black/80">{t}</p>)}
            {s.list && (
              <ul className="mt-2 space-y-2 list-disc ml-5 text-sm leading-relaxed text-black/80">
                {s.list.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            )}
            {s.contact && (
              <p className="mt-3 text-sm leading-relaxed text-black/80">
                Privacy questions, data requests or deletion requests (including from a parent or guardian): email{" "}
                <a href={`mailto:${CONTACT}`} data-testid="privacy-contact-email" className="font-bold underline">{CONTACT}</a>. We aim to reply within 5 business days.
              </p>
            )}
          </div>
        ))}
        <p className="text-sm text-black/60">Ready to get started? <Link to="/register" className="underline font-bold">Create a free account</Link> or <Link to="/" className="underline font-bold">go back home</Link>.</p>
      </section>
    </div>
  );
}
