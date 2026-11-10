# Halifax Youth Hub — PRD

## Original Problem Statement
Build a website for Halifax youth to access all youth-related programs (YouthWorx, BBI, LEAD, YMCA, summer jobs, etc.), browse jobs, RSVP to events, and build resumes (form-based + AI-assisted) — under one roof.

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB) on port 8001 (supervisor)
- **Frontend**: React 19 + Tailwind + Shadcn UI primitives, neo-brutalist visual system (2px black borders, hard offset shadows, `#FFD100` / `#0055A4` / `#FF3B30` palette, Bricolage Grotesk + Epilogue fonts)
- **Auth**: JWT (HS256) in httpOnly cookies, bcrypt password hashing, brute-force lockout, role guard
- **AI**: Claude Sonnet 4.5 via `emergentintegrations` for resume bullet suggestions (Emergent Universal Key)

## User Personas
1. **Halifax youth (14–24)** — discovers programs, applies to summer jobs, builds resume, RSVPs to events.
2. **Older youth / newcomers (25–30)** — entrepreneurship (BBI), Canada Summer Jobs, settlement.
3. **Admin / community partner staff** — manages program/job/event listings.

## Core Requirements (static)
- Programs Directory with filters (category, neighbourhood, age, search, featured)
- Halifax Job Board with category/search filters and external apply links
- Events calendar with RSVP
- Resume Builder (3 templates: classic / bold / compact) with AI bullet assistant + browser PDF export
- User dashboard: saved programs, resumes, RSVPs
- Admin panel: CRUD for programs, jobs, events
- JWT auth with brute-force protection

## What's Been Implemented (2026-02)
- ✅ All backend endpoints (auth, programs, jobs, events, resumes, AI assist, saved, RSVP) — 29/29 pytest pass
- ✅ Seeded 8 Halifax programs (YouthWorx, BBI, LEAD, YMCA, NS-SKILL, Canada Summer Jobs, Phoenix Youth, ISANS), 6 jobs, 4 events, 1 admin user
- ✅ All pages: Landing, Programs (list+detail), Jobs (list+detail), Events, Login, Register, Dashboard, Resume Builder, Admin
- ✅ AI resume bullet suggestions via Claude Sonnet 4.5
- ✅ Save program / RSVP flows with optimistic UI + toasts
- ✅ Browser-based PDF export (window.print on resume preview)
- ✅ Neo-brutalist design system + responsive nav with mobile menu
- ✅ Frontend testing 100% on all flagged flows

## Update (2026-06)
- ✅ Site renamed to Halifax Youth Hub (tab title, meta description, navbar, footer, API name)
- ✅ Resume builder open to guests; draft kept in browser. Save, PDF download and AI help need an account (sign-up modal, ?next=/resume redirect, guest draft auto-saved to account after login)
- ✅ AI summary write/polish (POST /api/resumes/ai-summary) + AI bullets, Claude Sonnet 4.6 via Emergent key
- ✅ Invalid ObjectId now returns 404 instead of 500
- ✅ Saved Jobs: bookmark button on live Job Bank cards + Spotlight cards (/jobs), "Saved Jobs" section on dashboard with remove + Apply link. Live postings are snapshotted (`saved_jobs` collection) since Job Bank listings expire. Endpoints: `POST /api/saved/jobs`, `DELETE /api/saved/jobs/{job_id}`, `GET /api/me/saved-jobs`
- ✅ Fixed `/api/live-jobs` 500 regression (`_build_url(audience)` signature) — youth audience uses Job Bank youth flag + title classifier
- ✅ Spotlight jobs expanded 5 → 17 (11 youth / 10 newcomer, real Halifax employers: Sobeys, Canada Post, HPL, HRM Rec, Cineplex, FSWEP, Hope Blooms, Dal, NSH CCA, Halifax Transit, Irving Shipbuilding, IWK, CRA…). `posted_at` field + "Posted Xd ago" badge, newest-first sort. Summer roles (YMCA camp, lifeguard, CSJ) only seeded Feb–Jul (`SUMMER_JOBS` in seed_data.py)
- ✅ Hardening: `re.escape` on all `$regex` search inputs; seed cleanup only deletes `seeded != False` docs so admin-created programs/jobs/events survive restarts; category filter resets on audience switch; save-toggle waits for saved list to load

## Update (2026-11-06, later)
- ✅ **AI Cover Letter writer** — `POST /api/cover-letters/generate` (Claude Sonnet 4.6 via Emergent key) drafts from a saved resume + job; CRUD on `cover_letters`. UI: `CoverLetterDialog` from dashboard saved-job cards, "Cover Letters" dashboard card, and `ResumeNextSteps` panel in the resume builder (appears once a resume is saved; lists spotlight jobs with Letter / Save / Apply — "finish a resume and see where to use it")
- ✅ **Application Tracker** — `status` (saved/applied/interviewed/hired) on `saved_jobs` and `saved_programs`; `PATCH /api/saved/{jobs|programs}/{id}/status`; `StatusSelect` on dashboard
- ✅ **Closing Soon** — `ClosingBadge` (≤7 days) on /jobs spotlight cards, dashboard cards and next-steps; red alert banner on dashboard; saved-job snapshot now stores `deadline` + `description`
- ✅ **Daily email digest** — Emergent Managed Email (Resend) via `backend/emailer.py` (guardrail gate, `EMAIL_FROM_NAME=Halifax Youth Hub`); cron `.emergent/crons.yml` → `POST /api/cron/closing-soon-digest` daily 09:00 America/Halifax (Bearer `WEBHOOK_CRON_SECRET`, idempotent via `cron_runs`, one email per user per day via `digest_log`); hard bounces auto-disable that user's reminders; `POST /api/me/closing-soon-digest/preview` lets a user email themselves (1/hour)
- ✅ **Privacy & account control** — `/privacy` page, register-page privacy note, `email_reminders` preference (`PATCH /api/me/preferences`), `DELETE /api/me` permanent self-serve deletion (dashboard "Delete my account")
- ✅ **Credibility fixes (user-requested)** — footer "Partners" → "Programs we list" + non-affiliation disclaimer; "300+ paid placements" replaced with live Job Bank count; "Jobs hiring this week" → "Hand-picked openings" with sourcing note; Youth Worx corrected to ages 16–24 / April & October intakes / next cohort Spring 2027 (checked halifax.ca 2026-11-06); fictional "LEAD" replaced with real HRM Youth Leadership Program (13+, summer); program detail shows accuracy note + `source_checked`; "Apply on partner site" → "Apply on official site"
- Env added: `EMERGENT_EMAIL_KEY`, `EMAIL_FROM_NAME`, `WEBHOOK_CRON_SECRET`; `FRONTEND_URL` updated to current preview URL (used in digest links — set to production domain on deploy)

## Update (2026-11-06, evening)
- ✅ **Interview Prep Coach** — unlocked when a saved job is marked Interviewed/Hired (gated in UI *and* backend). `POST /api/interview-prep/questions` → 8 tailored Qs with tip + sample answer (cached in `interview_preps`); `POST /api/interview-prep/chat` interactive mock (one Q at a time, feedback, summary after 6 answers, sessions in `interview_sessions`, 2000-char answers, no turns after complete); `GET /api/interview-prep/{job_id}`; `DELETE /api/interview-prep/sessions/{id}`. UI: `InterviewPrepDialog` (two tabs) via "Prep" button on dashboard cards
- ✅ **All 27 programs re-verified** against official pages (web research 2026-11-06) and stamped `source_checked`; corrected: BBI → Business is Jammin' (8–35, programs URL), NSTAY (13–24, sexual-exploitation support), Ready 4 Launch (15–30, 4+10 weeks), YMCA youth (Outreach 13–21 / LEAP 15–30 / EDGE 18–26), Phoenix (16–24 core, 11–24 therapy), Job Junction moved to 7001 Mumford Rd + Bedford, Team Work Co-op, SKILL (student status not age), SWPP (50%/$5,000 since Apr 2026), NSNP 4 streams (Feb 18 2026), ISANS 14,500+ / 170+ countries (2025–26), LINC eligibility + Language for Youth 16–30, ECE Pathway streams, Veith House schedule, YWCA Financial Literacy URL, UACWA address, AIP de-specified
- ✅ Privacy contact `kalisahornella412@gmail.com` on /privacy (mailto) and as `EMAIL_REPLY_TO` for digest replies
- ✅ Program accuracy note restyled for contrast; mock-interview restart race fixed; optimistic answer bubble
- ✅ **Events re-verified (8/8)** and stamped `source_checked` with "Details checked" badge; replaced fictional/closed entries: MetroWorks (bankrupt Mar 2025) removed from events + feeds; BBI pitch nights → BIJ STEM Boot Camp (real, Aug) ; ISANS fairs → Canadian Immigrant Fair Halifax (May 8 2026) ; library resume help → Job Junction/YMCA NS Works drop-ins at Central Library; YREACH (outside HRM) → YMCA Centre for Immigrant Programs Family Socials; added Halifax Job Fair & Training Expo
- ✅ **Progress & streaks** — `GET /api/me/progress` derives weekly activity from saved jobs/status changes, cover letters, mock sessions, resumes → streak weeks, this-week counts, ≤3 nudges; `ProgressCard` on dashboard refreshes after status/letter/prep actions
- ✅ **Brand kit** — `/brand/halifax-youth-hub-logo-kit.zip` (dark/light/on-colour PNGs, mark-only, icons, README) linked in footer; navbar uses `icon-64.png`
- ✅ `ScrollToTop` on every route change (fixes 'tapped a card and nothing happened' — pages opened mid-scroll); hero stat tiles (Programs / Open Jobs / Events) now link to their sections

## Phase 1 Community Directory (2026-11-10)
- ✅ New `listings` collection + `/community` directory (sibling of programs, nothing existing changed). 5 categories (`LISTING_CATEGORIES` in seed_data.py): Beauty & Personal Care, Photography & Creative Services, Restaurants & Food Businesses, Arts & Creative Communities, Faith & Spiritual Communities. Fields: name, category, short/full description, image_url (URL only — user chose no uploads), instagram (normalized handle → `instagram_url`), website, contact, neighbourhood, booking_url, tags, is_featured, status pending/approved. Public: `GET /api/listings[?category&q&featured]`, `GET /api/listings/{id}` (approved only; admin sees pending), `GET /api/listings/categories`. Admin: `GET /api/admin/listings`, `POST/PUT/PATCH/DELETE /api/listings/{id}` (PATCH = approve/unpublish/feature). 15 seeded example listings (labelled "Example:" except Nocturne, Halifax Dance, AGNS, Seaport Market); seeded docs never overwrite admin-edited ones (`seeded:false`). UI: `CommunityPage` (chips scroll on mobile, URL `?category=`), `ListingDetailPage` ("View Instagram", website, booking, contact), `ListingCard`, admin tab `community` (`CommunityAdmin`: add/edit/approve/feature/remove, pending count). "Submit your business" → Google Form https://forms.gle/ENhjYeLfwYp9BACA6 (manual review → admin adds). Navbar "Community".
- ✅ `BackButton` (history-aware with fallback) in header of programs/jobs/events/community/listing/dashboard/resume/privacy/admin.
- Tests: iteration_16 (100%).

## Phase 1 follow-ups (2026-11-10)
- ✅ Homepage `CommunityPicks` strip (featured listings, horizontal scroll on mobile) inserted between featured programs and spotlight jobs — no other homepage change
- ✅ Google Form → Sheet auto-import: `POST /api/admin/listings/import-sheet` (paste docs.google.com link; strict host validation, google-only redirects; heuristic column mapping; rows → pending listings tagged `submitted`; dedupe by slug + `import_log` row hash so deleted spam isn't re-imported), `GET/DELETE /api/admin/listings/import-settings`, hourly cron `POST /api/cron/import-listings` (crons.yml). UI `SheetImportPanel` in Admin → Community. **User has not yet pasted a sheet link.**
- ✅ Share Your Win: `ShareWinDialog` (canvas PNG card, yellow/black, download + Web Share) via "Share" button on Hired saved jobs
- ✅ Links: YWCA events feed → ywcahalifax.com/events/, Job Junction → jobjunction.ca/workshop-information/, HRM jobs → halifax.ca/about-halifax/employment
- ✅ Real listing added: ANFGC Halifax (All Nations Full Gospel Church, 2010 Purcells Cove Rd; featured). Example barber/photographer un-featured.
- ✅ Hero bottom-right photo replaced with user-supplied community photo (`/brand/hero-youth.jpg`)
- Tests: iteration_17 (100%) + SSRF/dedupe fixes verified by curl/unit run

## Security audit remediation (2026-11-06)
- Audit verdict: CONDITIONAL PASS (4 medium) → all fixed + hardening. Cookies `SameSite=Lax`; CSRF middleware (`csrf_and_headers`): unsafe /api/* requests need allow-listed Origin/Referer (403) and JSON content-type when a body is present (415), cron exempt; CORS exact allowlist from `CORS_ORIGINS`+`FRONTEND_URL` (wildcard discarded, regex removed) — **production must set CORS_ORIGINS/FRONTEND_URL to https://halifaxyouthhub.com**; AI daily quota (`AI_DAILY_LIMIT`=40/user, `ai_usage`, admins exempt) on all 5 LLM endpoints; account deletion wipes interview_preps/interview_sessions/ai_usage; no default admin password & no startup password reset; registration non-enumerating; `/api/stats` no user count; generic scraper errors; login throttle per ip+email (5) **and** per account (20), client IP = right-most X-Forwarded-For; security headers (nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy). Tests: iteration_14/15.
- ✅ Brand logo (user-supplied, white+yellow 'H' stacked mark) added: `frontend/public/brand/` — navbar tile `icon-512.png`, footer full stacked logo, favicons (32/180/512) + og:image in index.html

## Backlog (P1)
- Email notifications for RSVPs (Resend already wired)
- Direct PDF generation (server-side via reportlab) so styling is consistent across browsers
- Per-user rate limit on `/api/resumes/ai-assist` (currently unlimited)
- Map view of programs by neighbourhood

## Backlog (P2)
- OAuth (Google / Microsoft for school accounts)
- Mentor matching: pair youth with adult mentors based on interests
- Push notifications for new jobs matching saved filters
- French/Mi'kmaq language toggles
- Partner organizations admin self-service portal

## Test Credentials
See `/app/memory/test_credentials.md`.

## Deployment Notes
- All env vars in `/app/backend/.env` and `/app/frontend/.env` — never hardcode
- Frontend uses `REACT_APP_BACKEND_URL`, backend uses `MONGO_URL` + `DB_NAME`
- CORS uses regex `https://.*\.preview\.emergentagent\.com` plus explicit `FRONTEND_URL`
