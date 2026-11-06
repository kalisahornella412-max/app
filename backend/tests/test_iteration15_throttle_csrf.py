# Iteration 15: login throttle behind ingress (XFF) + Origin/Referer CSRF allowlist + mixed-case content-type + cron exemption
import os
import uuid
import pytest
import requests
from pymongo import MongoClient


def _env(path, key):
    for line in open(path):
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip('"')


BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _env("/app/frontend/.env", "REACT_APP_BACKEND_URL")).rstrip("/")
MONGO_URL = _env("/app/backend/.env", "MONGO_URL")
DB_NAME = _env("/app/backend/.env", "DB_NAME")
CRON_SECRET = _env("/app/backend/.env", "WEBHOOK_CRON_SECRET")
USER = {"email": "delivered@resend.dev", "password": "Test1234!"}
EVIL = "https://evil.example"


@pytest.fixture(scope="module")
def db():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


@pytest.fixture
def user_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=USER, headers={"Origin": BASE_URL})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def program_id():
    r = requests.get(f"{BASE_URL}/api/programs")
    assert r.status_code == 200 and r.json()
    return r.json()[0]["id"]


# --- Login throttle (ip+email limit 5)
class TestLoginThrottle:
    def test_sixth_attempt_429(self, db):
        email = f"test_throttle_{uuid.uuid4().hex[:8]}@example.com"
        try:
            codes = []
            for _ in range(6):
                r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "wrong-pass"})
                codes.append(r.status_code)
            assert codes[:5] == [401] * 5, codes
            assert codes[5] == 429, codes
            assert "Too many" in requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "x"}).json()["detail"]
        finally:
            db.login_attempts.delete_many({"identifier": {"$regex": f"{email}$"}})

    def test_ip_identifier_is_real_client_ip(self, db):
        email = f"test_ipident_{uuid.uuid4().hex[:8]}@example.com"
        try:
            requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "wrong"})
            recs = list(db.login_attempts.find({"identifier": {"$regex": f"{email}$"}}, {"_id": 0}))
            idents = [r["identifier"] for r in recs]
            print("identifiers:", idents)
            ip_ident = [i for i in idents if not i.startswith("acct:")][0]
            ip = ip_ident.rsplit(":" + email, 1)[0]
            assert not ip.startswith("10.") and ip != "unknown", ip
        finally:
            db.login_attempts.delete_many({"identifier": {"$regex": f"{email}$"}})


# --- CSRF Origin/Referer allowlist
class TestCsrf:
    def test_logout_evil_origin_403(self, user_session):
        r = user_session.post(f"{BASE_URL}/api/auth/logout", headers={"Origin": EVIL})
        assert r.status_code == 403
        assert r.json()["detail"] == "Cross-site request blocked"
        # session still valid
        assert user_session.get(f"{BASE_URL}/api/auth/me").status_code == 200

    def test_logout_evil_referer_no_origin_403(self, user_session):
        r = user_session.post(f"{BASE_URL}/api/auth/logout", headers={"Referer": f"{EVIL}/page"})
        assert r.status_code == 403
        assert r.json()["detail"] == "Cross-site request blocked"

    def test_null_origin_403(self, user_session):
        r = user_session.post(f"{BASE_URL}/api/auth/logout", headers={"Origin": "null"})
        assert r.status_code == 403

    def test_lookalike_origin_403(self, user_session):
        r = user_session.post(f"{BASE_URL}/api/auth/logout", headers={"Origin": BASE_URL + ".evil.example"})
        assert r.status_code == 403

    def test_save_program_form_empty_body_evil_origin_403(self, user_session, db, program_id):
        before = db.saved_programs.count_documents({"program_id": program_id})
        r = user_session.post(f"{BASE_URL}/api/saved/programs/{program_id}", data=b"",
                              headers={"Content-Type": "application/x-www-form-urlencoded", "Origin": EVIL})
        assert r.status_code == 403
        assert db.saved_programs.count_documents({"program_id": program_id}) == before

    def test_mixed_case_json_ctype_allowed(self, user_session):
        r = user_session.patch(f"{BASE_URL}/api/me/preferences", data='{"email_reminders": true}',
                               headers={"Content-Type": "Application/JSON", "Origin": BASE_URL})
        assert r.status_code == 200, r.text
        assert r.json()["email_reminders"] is True

    def test_same_origin_referer_allowed(self, user_session):
        r = user_session.patch(f"{BASE_URL}/api/me/preferences", json={"email_reminders": True},
                               headers={"Referer": f"{BASE_URL}/dashboard"})
        assert r.status_code == 200

    def test_logout_own_origin_200(self, user_session):
        r = user_session.post(f"{BASE_URL}/api/auth/logout", headers={"Origin": BASE_URL})
        assert r.status_code == 200
        assert r.json() == {"ok": True}

    def test_get_with_evil_origin_not_blocked(self):
        r = requests.get(f"{BASE_URL}/api/stats", headers={"Origin": EVIL})
        assert r.status_code == 200


# --- Cron exempt from Origin check
class TestCron:
    def test_cron_no_origin_200(self):
        r = requests.post(f"{BASE_URL}/api/cron/closing-soon-digest", json={},
                          headers={"Authorization": f"Bearer {CRON_SECRET}", "X-Webhook-Id": str(uuid.uuid4())})
        assert r.status_code == 200, r.text
        assert r.json()["accepted"] is True

    def test_cron_bad_secret_401(self):
        r = requests.post(f"{BASE_URL}/api/cron/closing-soon-digest", json={},
                          headers={"Authorization": "Bearer wrong", "X-Webhook-Id": str(uuid.uuid4())})
        assert r.status_code == 401
