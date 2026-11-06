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

## Backlog (P1)
- Verify remaining 25 program entries against official pages (Youth Worx + HRM Youth Leadership done); add `source_checked` to each
- Privacy contact email: user to supply a real inbox for privacy requests (policy currently says "via the contact details shared with partner organizations")
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
