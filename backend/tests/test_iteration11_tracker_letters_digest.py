# Iteration 11: preferences, application tracker, cover letters, closing-soon digest, content, account deletion
import os
import uuid
import requests
import pytest
from datetime import datetime, timedelta, timezone
from dotenv import dotenv_values

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]
BASE_URL = BASE_URL.rstrip("/")
CRON_SECRET = dotenv_values("/app/backend/.env")["WEBHOOK_CRON_SECRET"]
DELIV = {"email": "delivered@resend.dev", "password": "Test1234!"}
ADMIN = {"email": "admin@halifaxyouth.ca", "password": "admin123"}


def login(creds):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"login failed {creds['email']}: {r.status_code} {r.text}")
    return s


@pytest.fixture(scope="module")
def deliv():
    return login(DELIV)


@pytest.fixture(scope="module")
def admin():
    return login(ADMIN)


# --- Preferences ---
class TestPreferences:
    def test_me_has_email_reminders_and_patch(self, deliv):
        me = deliv.get(f"{BASE_URL}/api/auth/me").json()
        assert isinstance(me.get("email_reminders"), bool)
        r = deliv.patch(f"{BASE_URL}/api/me/preferences", json={"email_reminders": False})
        assert r.status_code == 200 and r.json()["email_reminders"] is False
        assert deliv.get(f"{BASE_URL}/api/auth/me").json()["email_reminders"] is False
        r = deliv.patch(f"{BASE_URL}/api/me/preferences", json={"email_reminders": True})
        assert r.status_code == 200 and r.json()["email_reminders"] is True
        assert deliv.get(f"{BASE_URL}/api/auth/me").json()["email_reminders"] is True


# --- Application tracker ---
class TestTracker:
    def test_saved_jobs_status_flow(self, deliv):
        jobs = deliv.get(f"{BASE_URL}/api/me/saved-jobs").json()
        assert len(jobs) >= 1
        assert all("status" in j for j in jobs)
        job = jobs[0]
        orig = job["status"]
        r = deliv.patch(f"{BASE_URL}/api/saved/jobs/{job['job_id']}/status", json={"status": "interviewed"})
        assert r.status_code == 200 and r.json()["status"] == "interviewed"
        after = {j["job_id"]: j for j in deliv.get(f"{BASE_URL}/api/me/saved-jobs").json()}
        assert after[job["job_id"]]["status"] == "interviewed"
        bad = deliv.patch(f"{BASE_URL}/api/saved/jobs/{job['job_id']}/status", json={"status": "bogus"})
        assert bad.status_code == 400
        nf = deliv.patch(f"{BASE_URL}/api/saved/jobs/nope-{uuid.uuid4()}/status", json={"status": "applied"})
        assert nf.status_code == 404
        deliv.patch(f"{BASE_URL}/api/saved/jobs/{job['job_id']}/status", json={"status": orig if orig != "hired" else "saved"})

    def test_saved_program_status_flow(self, deliv):
        progs = requests.get(f"{BASE_URL}/api/programs").json()
        before = {p["id"] for p in deliv.get(f"{BASE_URL}/api/me/saved-programs").json()}
        target = next((p for p in progs if p["id"] not in before), progs[0])
        pid = target["id"]
        r = deliv.post(f"{BASE_URL}/api/saved/programs/{pid}")
        assert r.status_code in (200, 201)
        saved = {p["id"]: p for p in deliv.get(f"{BASE_URL}/api/me/saved-programs").json()}
        assert pid in saved and saved[pid]["status"] == "saved"
        r = deliv.patch(f"{BASE_URL}/api/saved/programs/{pid}/status", json={"status": "applied"})
        assert r.status_code == 200
        saved = {p["id"]: p for p in deliv.get(f"{BASE_URL}/api/me/saved-programs").json()}
        assert saved[pid]["status"] == "applied"
        if pid not in before:
            deliv.delete(f"{BASE_URL}/api/saved/programs/{pid}")


# --- Cover letters ---
class TestCoverLetters:
    def test_unauth_401(self):
        assert requests.get(f"{BASE_URL}/api/cover-letters").status_code == 401
        assert requests.post(f"{BASE_URL}/api/cover-letters/generate", json={"resume_id": "x", "job_title": "y"}).status_code == 401

    def test_other_users_resume_404(self, deliv, admin):
        rid = deliv.get(f"{BASE_URL}/api/resumes").json()[0]["id"]
        r = admin.post(f"{BASE_URL}/api/cover-letters/generate", json={"resume_id": rid, "job_title": "X"})
        assert r.status_code == 404

    def test_invalid_resume_id_format(self, deliv):
        r = deliv.post(f"{BASE_URL}/api/cover-letters/generate", json={"resume_id": "not-an-id", "job_title": "X"})
        assert r.status_code in (400, 404, 422), f"got {r.status_code}"

    def test_generate_list_update_delete(self, deliv):
        rid = deliv.get(f"{BASE_URL}/api/resumes").json()[0]["id"]
        r = deliv.post(f"{BASE_URL}/api/cover-letters/generate", json={
            "resume_id": rid, "job_title": "TEST_Library Page", "employer": "Halifax Public Libraries",
            "job_description": "Shelve books, help patrons."}, timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["id"] and "TEST_Library Page" in d["title"]
        assert "Dear Hiring Manager" in d["content"] and "Sincerely" in d["content"]
        lid = d["id"]
        try:
            assert lid in [x["id"] for x in deliv.get(f"{BASE_URL}/api/cover-letters").json()]
            u = deliv.put(f"{BASE_URL}/api/cover-letters/{lid}", json={"content": "edited"})
            assert u.status_code == 200 and u.json()["content"] == "edited"
            got = {x["id"]: x for x in deliv.get(f"{BASE_URL}/api/cover-letters").json()}
            assert got[lid]["content"] == "edited"
        finally:
            assert deliv.delete(f"{BASE_URL}/api/cover-letters/{lid}").status_code == 200
        assert lid not in [x["id"] for x in deliv.get(f"{BASE_URL}/api/cover-letters").json()]


# --- Email digest ---
class TestDigest:
    def test_preview_deliverable(self, deliv):
        r = deliv.post(f"{BASE_URL}/api/me/closing-soon-digest/preview", timeout=40)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True and d["count"] >= 1 and d.get("email_id")

    def test_preview_fake_domain_400(self, admin):
        # give admin a closing-soon saved job so the email send path is exercised
        jid = f"TEST_job_{uuid.uuid4().hex[:8]}"
        dl = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
        admin.post(f"{BASE_URL}/api/saved/jobs", json={"job_id": jid, "title": "TEST_Closing", "apply_url": "https://example.com", "deadline": dl})
        try:
            r = admin.post(f"{BASE_URL}/api/me/closing-soon-digest/preview", timeout=40)
            print(r.status_code, r.text)
            assert r.status_code == 400
            assert "detail" in r.json() and len(r.json()["detail"]) > 5
        finally:
            admin.delete(f"{BASE_URL}/api/saved/jobs/{jid}")

    def test_cron_auth_and_idempotency(self):
        assert requests.post(f"{BASE_URL}/api/cron/closing-soon-digest").status_code == 401
        assert requests.post(f"{BASE_URL}/api/cron/closing-soon-digest", headers={"Authorization": "Bearer wrong"}).status_code == 401
        wid = str(uuid.uuid4())
        h = {"Authorization": f"Bearer {CRON_SECRET}", "X-Webhook-Id": wid}
        r = requests.post(f"{BASE_URL}/api/cron/closing-soon-digest", headers=h)
        assert r.status_code == 200 and r.json() == {"accepted": True}
        r2 = requests.post(f"{BASE_URL}/api/cron/closing-soon-digest", headers=h)
        assert r2.status_code == 200 and r2.json().get("duplicate") is True


# --- Content ---
class TestContent:
    def test_programs_content(self):
        progs = requests.get(f"{BASE_URL}/api/programs").json()
        names = {p["name"]: p for p in progs}
        yw = names.get("Youth Worx (HRM Parks & Recreation)")
        assert yw and yw["age_min"] == 16 and yw["age_max"] == 24 and yw.get("source_checked")
        hl = names.get("HRM Youth Leadership Program")
        assert hl and hl["age_min"] == 13
        assert "LEAD — Leadership Excellence & Development" not in names

    def test_library_job_closing_soon(self):
        r = requests.get(f"{BASE_URL}/api/jobs", params={"q": "library"}).json()
        items = r if isinstance(r, list) else (r.get("items") or r.get("jobs") or r.get("spotlight") or [])
        if isinstance(r, dict) and not items:
            items = [x for v in r.values() if isinstance(v, list) for x in v]
        lib = [j for j in items if "library" in (j.get("title", "") + j.get("employer", "")).lower() and "page" in j.get("title", "").lower()]
        assert lib, f"no Library Page job: {str(r)[:400]}"
        dl = datetime.fromisoformat(lib[0]["deadline"].replace("Z", "+00:00"))
        if not dl.tzinfo:
            dl = dl.replace(tzinfo=timezone.utc)
        assert dl - datetime.now(timezone.utc) <= timedelta(days=7)


# --- Account deletion ---
class TestDeleteAccount:
    def test_delete_flow(self):
        email = f"test_del_{uuid.uuid4().hex[:8]}@example.com"
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": "Test1234!", "name": "TEST_Del"})
        assert r.status_code in (200, 201), r.text
        assert s.post(f"{BASE_URL}/api/resumes", json={"title": "TEST_r", "full_name": "TEST Del"}).status_code == 200
        assert s.post(f"{BASE_URL}/api/saved/jobs", json={"job_id": "TEST_j1", "title": "T", "apply_url": "https://example.com"}).status_code == 200
        d = s.delete(f"{BASE_URL}/api/me")
        assert d.status_code == 200 and d.json()["ok"] is True
        assert s.get(f"{BASE_URL}/api/auth/me").status_code == 401
        assert requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "Test1234!"}).status_code == 401
