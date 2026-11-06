# Iteration 12: Interview Prep Coach (questions + mock chat) and program re-verification
import os
import requests
import pytest
from dotenv import dotenv_values

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/")
DELIV = {"email": "delivered@resend.dev", "password": "Test1234!"}


@pytest.fixture(scope="module")
def deliv():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=DELIV, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"login failed {r.status_code}")
    return s


@pytest.fixture(scope="module")
def job_id(deliv):
    jobs = deliv.get(f"{BASE_URL}/api/me/saved-jobs", timeout=20).json()
    jobs = jobs if isinstance(jobs, list) else jobs.get("items", jobs.get("jobs", []))
    assert jobs, "no saved jobs"
    print("saved job status:", jobs[0].get("status"))
    return jobs[0]["job_id"]


# --- Interview questions ---
class TestInterviewQuestions:
    def test_generate_questions(self, deliv, job_id):
        r = deliv.post(f"{BASE_URL}/api/interview-prep/questions", json={"job_id": job_id}, timeout=90)
        assert r.status_code == 200, r.text
        qs = r.json()["questions"]
        assert len(qs) == 8
        for q in qs:
            assert q.get("question") and q.get("tip") and q.get("sample_answer")

    def test_get_cached(self, deliv, job_id):
        r = deliv.get(f"{BASE_URL}/api/interview-prep/{job_id}", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert len(d["prep"]["questions"]) == 8
        assert "session" in d
        assert "_id" not in (d["prep"] or {})

    def test_unknown_job_404(self, deliv):
        r = deliv.post(f"{BASE_URL}/api/interview-prep/questions", json={"job_id": "nope-xyz-123"}, timeout=20)
        assert r.status_code == 404
        r = deliv.post(f"{BASE_URL}/api/interview-prep/chat", json={"job_id": "nope-xyz-123"}, timeout=20)
        assert r.status_code == 404

    def test_unauth_401(self, job_id):
        for m, p in [("post", "/api/interview-prep/questions"), ("post", "/api/interview-prep/chat"), ("get", f"/api/interview-prep/{job_id}"), ("delete", "/api/interview-prep/sessions/x")]:
            r = getattr(requests, m)(f"{BASE_URL}{p}", json={"job_id": job_id}, timeout=20)
            assert r.status_code == 401, f"{m} {p} -> {r.status_code}"

    def test_invalid_resume_id(self, deliv, job_id):
        r = deliv.post(f"{BASE_URL}/api/interview-prep/chat", json={"job_id": "nope-xyz-123", "resume_id": "bad"}, timeout=20)
        print("invalid resume_id on unknown job:", r.status_code)
        # job check happens first -> 404
        assert r.status_code == 404


# --- Mock interview chat ---
class TestMockChat:
    def test_chat_flow(self, deliv, job_id):
        r = deliv.post(f"{BASE_URL}/api/interview-prep/chat", json={"job_id": job_id}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        sid = d["session_id"]
        assert d["messages"][0]["role"] == "assistant" and "?" in d["messages"][0]["content"]
        assert d["complete"] is False
        r = deliv.post(f"{BASE_URL}/api/interview-prep/chat", json={"job_id": job_id, "session_id": sid,
                       "message": "I volunteer at the library tutoring kids and I am very organized."}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        roles = [m["role"] for m in d["messages"]]
        assert roles == ["assistant", "user", "assistant"]
        last = d["messages"][-1]["content"]
        print("FEEDBACK:", last)
        assert "**" not in last and len(last) > 40
        assert d["session_id"] == sid
        g = deliv.get(f"{BASE_URL}/api/interview-prep/{job_id}", timeout=20).json()
        assert g["session"]["session_id"] == sid and len(g["session"]["messages"]) == 3
        r = deliv.delete(f"{BASE_URL}/api/interview-prep/sessions/{sid}", timeout=20)
        assert r.status_code == 200 and r.json()["ok"] is True
        g = deliv.get(f"{BASE_URL}/api/interview-prep/{job_id}", timeout=20).json()
        assert not g["session"] or g["session"]["session_id"] != sid


# --- Programs re-verification ---
class TestPrograms:
    @pytest.fixture(scope="class")
    def progs(self):
        r = requests.get(f"{BASE_URL}/api/programs", timeout=20)
        assert r.status_code == 200
        d = r.json()
        return d if isinstance(d, list) else d.get("items", d.get("programs"))

    def by_slug(self, progs, slug):
        p = [x for x in progs if x.get("slug") == slug]
        assert p, f"missing {slug}"
        return p[0]

    def test_count_and_stamp(self, progs):
        assert len(progs) == 27
        bad = [p.get("slug") for p in progs if p.get("source_checked") != "2026-11-06"]
        assert not bad, bad

    def test_bbi(self, progs):
        p = self.by_slug(progs, "bbi-initiative")
        assert p["age_min"] == 8 and p["age_max"] == 35
        assert p["apply_url"] == "https://businessisjammin.ca/programs/"

    def test_ages(self, progs):
        p = self.by_slug(progs, "nstay-ywca"); assert (p["age_min"], p["age_max"]) == (13, 24)
        p = self.by_slug(progs, "ywca-ready-4-launch"); assert (p["age_min"], p["age_max"]) == (15, 30)

    def test_text_spotchecks(self, progs):
        assert "7001 Mumford" in (self.by_slug(progs, "job-junction").get("neighbourhood") or "")
        assert "$5,000" in self.by_slug(progs, "swpp")["short_description"]
        nsnp = self.by_slug(progs, "ns-nominee-program")
        assert "Feb 18, 2026" in str(nsnp)
        for p in progs:
            assert "IWK Health and HRM are designated" not in str(p)
