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

## Backlog (P1)
- Email notifications for RSVPs and application reminders (Resend/SendGrid)
- Direct PDF generation (server-side via reportlab) so styling is consistent across browsers
- Per-user rate limit on `/api/resumes/ai-assist` (currently unlimited)
- "Application tracker" — let users mark programs/jobs as Applied / Interviewed / Hired
- Resume cover-letter AI generator
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
