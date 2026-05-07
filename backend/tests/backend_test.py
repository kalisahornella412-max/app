"""
Backend regression tests for Halifax Youth Programs API.
Covers: stats, programs, jobs, events, auth (register/login/me/logout/lockout),
admin RBAC, resumes (CRUD + AI assist), saved programs, RSVPs.
"""
import os
import time
import requests
import pytest

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@halifaxyouth.ca"
ADMIN_PASSWORD = "admin123"

TS = str(int(time.time()))
TEST_USER_EMAIL = f"testuser+{TS}@halifaxyouth.ca"
TEST_USER_PASSWORD = "Test1234!"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def anon_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def user_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/register", json={
        "email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD, "name": "Test User"
    })
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


# ---------- Health & Stats ----------
class TestHealth:
    def test_root(self, anon_session):
        r = anon_session.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_stats_seeded(self, anon_session):
        r = anon_session.get(f"{API}/stats")
        assert r.status_code == 200
        d = r.json()
        assert d["programs"] >= 8
        assert d["jobs"] >= 6
        assert d["events"] >= 4
        assert d["users"] >= 1


# ---------- Programs ----------
class TestPrograms:
    def test_list_programs(self, anon_session):
        r = anon_session.get(f"{API}/programs")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 8
        assert "id" in data[0]
        assert "slug" in data[0]

    def test_filter_featured(self, anon_session):
        r = anon_session.get(f"{API}/programs", params={"featured": "true"})
        assert r.status_code == 200
        for p in r.json():
            assert p.get("is_featured") is True

    def test_filter_q(self, anon_session):
        r = anon_session.get(f"{API}/programs", params={"q": "youth"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_filter_category(self, anon_session):
        r = anon_session.get(f"{API}/programs", params={"category": "all"})
        assert r.status_code == 200

    def test_get_by_slug(self, anon_session):
        progs = anon_session.get(f"{API}/programs").json()
        slug = progs[0]["slug"]
        r = anon_session.get(f"{API}/programs/{slug}")
        assert r.status_code == 200
        assert r.json()["slug"] == slug

    def test_get_by_id(self, anon_session):
        progs = anon_session.get(f"{API}/programs").json()
        pid = progs[0]["id"]
        r = anon_session.get(f"{API}/programs/{pid}")
        assert r.status_code == 200
        assert r.json()["id"] == pid

    def test_get_404(self, anon_session):
        r = anon_session.get(f"{API}/programs/nonexistent-slug-xyz")
        assert r.status_code == 404


# ---------- Jobs ----------
class TestJobs:
    def test_list_jobs(self, anon_session):
        r = anon_session.get(f"{API}/jobs")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 6
        assert "id" in data[0]

    def test_get_job(self, anon_session):
        jobs = anon_session.get(f"{API}/jobs").json()
        jid = jobs[0]["id"]
        r = anon_session.get(f"{API}/jobs/{jid}")
        assert r.status_code == 200
        assert r.json()["id"] == jid


# ---------- Events ----------
class TestEvents:
    def test_list_events(self, anon_session):
        r = anon_session.get(f"{API}/events")
        assert r.status_code == 200
        assert len(r.json()) >= 4

    def test_get_event(self, anon_session):
        ev = anon_session.get(f"{API}/events").json()[0]
        r = anon_session.get(f"{API}/events/{ev['id']}")
        assert r.status_code == 200


# ---------- Auth ----------
class TestAuth:
    def test_register_and_me(self, user_session):
        r = user_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == TEST_USER_EMAIL
        assert r.json()["role"] == "user"

    def test_register_duplicate(self, anon_session):
        r = anon_session.post(f"{API}/auth/register", json={
            "email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD, "name": "Dup"
        })
        assert r.status_code == 400

    def test_login_admin(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "admin"
        # Verify cookies were set
        assert "access_token" in admin_session.cookies

    def test_login_invalid(self, anon_session):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpass"})
        assert r.status_code == 401

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout(self, user_session):
        r = user_session.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # log back in for subsequent tests
        r = user_session.post(f"{API}/auth/login", json={
            "email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD
        })
        assert r.status_code == 200

    def test_brute_force_lockout(self):
        s = requests.Session()
        # use a unique non-existent email so we don't lock out other tests
        bad_email = f"locktest+{int(time.time())}@halifaxyouth.ca"
        # register first to have an actual account to lock
        s.post(f"{API}/auth/register", json={
            "email": bad_email, "password": "Correct123!", "name": "LockTest"
        })
        s.post(f"{API}/auth/logout")
        last_status = None
        for i in range(7):
            r = s.post(f"{API}/auth/login", json={"email": bad_email, "password": "WrongPass!"})
            last_status = r.status_code
        assert last_status == 429, f"expected 429 lockout, got {last_status}"


# ---------- Admin RBAC ----------
class TestAdmin:
    def test_create_program_as_admin(self, admin_session):
        payload = {
            "slug": f"test-prog-{TS}",
            "name": "TEST_Program",
            "organization": "TEST Org",
            "category": "Mentorship",
            "short_description": "test",
            "description": "test desc",
        }
        r = admin_session.post(f"{API}/programs", json=payload)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        # cleanup
        admin_session.delete(f"{API}/programs/{pid}")

    def test_create_program_as_user_forbidden(self, user_session):
        payload = {
            "slug": f"test-prog-x-{TS}",
            "name": "X",
            "organization": "X",
            "category": "Mentorship",
            "short_description": "x",
            "description": "x",
        }
        r = user_session.post(f"{API}/programs", json=payload)
        assert r.status_code == 403

    def test_create_job_as_admin(self, admin_session):
        payload = {
            "title": "TEST_Job", "employer": "Test", "category": "Retail",
            "location": "Halifax", "short_description": "x", "description": "x",
        }
        r = admin_session.post(f"{API}/jobs", json=payload)
        assert r.status_code == 200
        admin_session.delete(f"{API}/jobs/{r.json()['id']}")

    def test_create_event_as_admin(self, admin_session):
        payload = {
            "title": "TEST_Event", "host": "Test", "category": "Workshop",
            "location": "Halifax", "starts_at": "2026-06-01T18:00:00Z",
            "description": "x",
        }
        r = admin_session.post(f"{API}/events", json=payload)
        assert r.status_code == 200
        admin_session.delete(f"{API}/events/{r.json()['id']}")


# ---------- Resumes ----------
class TestResumes:
    def test_resume_crud(self, user_session):
        payload = {"title": "TEST_Resume", "template": "classic", "full_name": "T U"}
        r = user_session.post(f"{API}/resumes", json=payload)
        assert r.status_code == 200, r.text
        rid = r.json()["id"]

        # list
        r = user_session.get(f"{API}/resumes")
        assert r.status_code == 200
        assert any(x["id"] == rid for x in r.json())

        # update
        upd = dict(payload, headline="Updated")
        r = user_session.put(f"{API}/resumes/{rid}", json=upd)
        assert r.status_code == 200
        assert r.json()["headline"] == "Updated"

        # get
        r = user_session.get(f"{API}/resumes/{rid}")
        assert r.status_code == 200
        assert r.json()["headline"] == "Updated"

        # delete
        r = user_session.delete(f"{API}/resumes/{rid}")
        assert r.status_code == 200

    def test_resume_unauth(self):
        r = requests.get(f"{API}/resumes")
        assert r.status_code == 401

    def test_ai_assist(self, user_session):
        r = user_session.post(f"{API}/resumes/ai-assist", json={
            "role": "Barista", "company": "Cafe X", "notes": "team player"
        }, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "bullets" in d
        assert isinstance(d["bullets"], list)
        assert len(d["bullets"]) >= 1


# ---------- Saved Programs & RSVPs ----------
class TestSavedAndRsvp:
    def test_save_program(self, user_session, anon_session):
        progs = anon_session.get(f"{API}/programs").json()
        pid = progs[0]["id"]
        r = user_session.post(f"{API}/saved/programs/{pid}")
        assert r.status_code == 200

        r = user_session.get(f"{API}/me/saved-programs")
        assert r.status_code == 200
        assert any(p["id"] == pid for p in r.json())

        r = user_session.delete(f"{API}/saved/programs/{pid}")
        assert r.status_code == 200

    def test_rsvp(self, user_session, anon_session):
        ev = anon_session.get(f"{API}/events").json()[0]
        eid = ev["id"]
        r = user_session.post(f"{API}/events/{eid}/rsvp")
        assert r.status_code == 200

        r = user_session.get(f"{API}/me/rsvps")
        assert r.status_code == 200
        assert any(x["event_id"] == eid for x in r.json())

        r = user_session.delete(f"{API}/events/{eid}/rsvp")
        assert r.status_code == 200
